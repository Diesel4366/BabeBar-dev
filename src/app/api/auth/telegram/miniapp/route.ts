import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createUserToken } from '@/lib/userAuth';

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

async function verifyInitData(initData: string): Promise<TgUser | null> {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const enc = new TextEncoder();

  // secret = HMAC-SHA256(key="WebAppData", data=bot_token)
  const webAppDataKey = await crypto.subtle.importKey(
    'raw', enc.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const secretBytes = await crypto.subtle.sign('HMAC', webAppDataKey, enc.encode(token));

  // computed = HMAC-SHA256(key=secret, data=dataCheckString)
  const secretKey = await crypto.subtle.importKey(
    'raw', secretBytes,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', secretKey, enc.encode(dataCheckString));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (computed !== hash) return null;

  const authDate = parseInt(params.get('auth_date') ?? '0');
  if (Math.floor(Date.now() / 1000) - authDate > 86400) return null;

  const userStr = params.get('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { initData, state } = await req.json().catch(() => ({}));
  if (!initData) return NextResponse.json({ error: 'No initData' }, { status: 400 });

  const tgUser = await verifyInitData(initData);
  if (!tgUser) return NextResponse.json({ error: 'Invalid initData' }, { status: 401 });

  const telegramId = String(tgUser.id);
  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');

  // Ищем только по telegram_id — username может сменить владелец, поэтому не используем его как идентификатор
  let { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  // Создаём новый профиль
  if (!profile) {
    const { data: created, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        telegram_id: telegramId,
        telegram_username: tgUser.username ?? null,
        telegram_photo: tgUser.photo_url ?? null,
        name,
        phone: null,
      })
      .select('id')
      .single();

    if (error || !created) {
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    profile = created;
  } else {
    // Обновляем данные
    const updateData: Record<string, string | null> = { name };
    if (tgUser.username) updateData.telegram_username = tgUser.username;
    if (tgUser.photo_url) updateData.telegram_photo = tgUser.photo_url;
    await supabaseAdmin.from('profiles').update(updateData).eq('id', profile.id);
  }

  const token = await createUserToken(profile.id, process.env.ADMIN_SECRET!);
  const redirectTo = state === 'booking' ? '/booking?restore=1' : '/profile';

  const res = NextResponse.json({ success: true, redirectTo });
  res.cookies.set('user_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
