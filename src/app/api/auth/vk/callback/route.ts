import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { createUserToken } from '@/lib/userAuth';

interface VkUser {
  id: number;
  first_name: string;
  last_name: string;
  screen_name: string;
  photo_100: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const headersList = await headers();
  const host = headersList.get('host') ?? 'babe-bar.vercel.app';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/vk/callback`;

  const fail = (msg?: string) => {
    const errorParam = msg ? encodeURIComponent(msg) : '1';
    return NextResponse.redirect(new URL(`/login?error=${errorParam}`, origin));
  };

  const code = url.searchParams.get('code');
  if (!code) return fail('VK: no code');

  // 1. Обмен кода на токен
  const tokenParams = new URLSearchParams({
    client_id: process.env.VK_APP_ID!,
    client_secret: process.env.VK_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch(`https://oauth.vk.com/access_token?${tokenParams}`);
  if (!tokenRes.ok) return fail('VK: token exchange failed');

  const tokenData = await tokenRes.json();
  if (tokenData.error) return fail(`VK: ${tokenData.error_description}`);

  const { access_token, user_id } = tokenData as { access_token: string; user_id: number };

  // 2. Получение данных пользователя
  const apiParams = new URLSearchParams({
    user_ids: String(user_id),
    fields: 'photo_100,screen_name',
    access_token,
    v: '5.131',
  });

  const userRes = await fetch(`https://api.vk.com/method/users.get?${apiParams}`);
  const userData = await userRes.json();
  const vkUser: VkUser | undefined = userData?.response?.[0];
  if (!vkUser) return fail('VK: failed to get user info');

  const vkId = String(vkUser.id);
  const name = [vkUser.first_name, vkUser.last_name].filter(Boolean).join(' ');
  const photo = vkUser.photo_100 ?? null;

  // 3. Найти или создать профиль
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('vk_id', vkId)
    .maybeSingle();

  let profileId: string;

  if (existing) {
    profileId = existing.id;
    await supabaseAdmin.from('profiles').update({ name, telegram_photo: photo }).eq('id', profileId);
  } else {
    const { data: created, error } = await supabaseAdmin
      .from('profiles')
      .insert({ id: crypto.randomUUID(), vk_id: vkId, name, telegram_photo: photo, phone: null })
      .select('id')
      .single();

    if (error || !created) return fail(`DB: ${error?.message}`);
    profileId = created.id;
  }

  // 4. Выдать cookie и редиректнуть
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
