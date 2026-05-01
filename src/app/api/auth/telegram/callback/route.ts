import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramAuth, createUserToken } from '@/lib/userAuth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const fail = () => NextResponse.redirect(new URL('/login?error=1', origin));

  let tgData: Record<string, string> = {};

  const tgAuthResult = url.searchParams.get('tgAuthResult');
  if (tgAuthResult) {
    try {
      const b64 = tgAuthResult.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(b64);
      const parsed = JSON.parse(decoded);
      tgData = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]));
    } catch {
      return fail();
    }
  } else {
    url.searchParams.forEach((v, k) => { tgData[k] = v; });
  }

  if (!tgData.id || !tgData.hash) return fail();

  const valid = await verifyTelegramAuth(tgData);
  if (!valid) return fail();

  const telegramId = parseInt(tgData.id);

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
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
        telegram_id: telegramId,
        name: tgData.first_name ?? null,
        telegram_username: tgData.username ?? null,
        telegram_photo: tgData.photo_url ?? null,
        phone: null,
      })
      .select('id')
      .single();

    if (error || !created) return fail();
    profileId = created.id;
  }

  const token = await createUserToken(profileId, process.env.ADMIN_SECRET!);
  const res = NextResponse.redirect(new URL('/profile', origin));
  res.cookies.set('user_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
