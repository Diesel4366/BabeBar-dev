import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramAuth, createUserToken, exchangeTelegramCode } from '@/lib/userAuth';

async function fetchBotApiPhoto(telegramId: string): Promise<string | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  if (!botToken) return null;
  try {
    const r1 = await fetch(
      `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const d1 = await r1.json();
    if (!d1.ok || !d1.result?.photos?.[0]?.length) return null;
    const sizes = d1.result.photos[0];
    const fileId = sizes[sizes.length - 1].file_id;
    const r2 = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const d2 = await r2.json();
    if (!d2.ok || !d2.result?.file_path) return null;
    return `https://api.telegram.org/file/bot${botToken}/${d2.result.file_path}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const fail = (msg?: string) => {
    console.error('Auth fail:', msg);
    const errorParam = msg ? encodeURIComponent(msg) : '1';
    return NextResponse.redirect(new URL(`/login?error=${errorParam}`, origin));
  };

  let tgData: Record<string, string> = {};

  // 1. ПРОВЕРЯЕМ НОВЫЙ МЕТОД (OIDC)
  const code = url.searchParams.get('code');
  if (code) {
    const userData = await exchangeTelegramCode(code);
    if (!userData) return fail('Code exchange failed');
    const photoUrl = userData.photo_url || '';
    tgData = {
      id: userData.id,
      first_name: userData.first_name,
      username: userData.username || '',
      photo_url: photoUrl,
    };
  } else {
    // 2. СТАРЫЙ МЕТОД (Widget)
    const tgAuthResult = url.searchParams.get('tgAuthResult');
    if (tgAuthResult) {
      try {
        const b64 = tgAuthResult.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(b64);
        const parsed = JSON.parse(decoded);
        tgData = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]));
      } catch {
        return fail('JSON parse failed');
      }
    } else {
      url.searchParams.forEach((v, k) => { tgData[k] = v; });
    }

    if (!tgData.id || !tgData.hash) return fail('Missing ID or Hash');

    const valid = await verifyTelegramAuth(tgData);
    if (!valid) return fail('Hash verification failed');
  }

  const oidcId = tgData.id; // Это зашифрованный ID от OIDC

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('oidc_id', oidcId)
    .maybeSingle();

  let profileId: string;

  if (existing) {
    profileId = existing.id;
    await supabaseAdmin.from('profiles').update({
      name: tgData.first_name ?? null,
      telegram_username: tgData.username ?? null,
      telegram_photo: tgData.photo_url ?? null,
    }).eq('id', profileId);
  } else {
    const { data: created, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        oidc_id: oidcId,
        name: tgData.first_name ?? null,
        telegram_username: tgData.username ?? null,
        telegram_photo: tgData.photo_url ?? null,
        phone: null,
      })
      .select('id')
      .single();

    if (error || !created) {
      console.error('DB Error details:', error);
      return fail(`DB error: ${error?.message || 'Unknown'}`);
    }
    profileId = created.id;
  }

  const token = await createUserToken(profileId, process.env.ADMIN_SECRET!);
  const state = url.searchParams.get('state');
  const redirectTo = state === 'booking' ? '/booking?restore=1' : '/profile';
  const res = NextResponse.redirect(new URL(redirectTo, origin));
  res.cookies.set('user_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
