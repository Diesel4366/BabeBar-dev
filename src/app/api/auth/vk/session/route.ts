import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createUserToken } from '@/lib/userAuth';

interface VkUserInfo {
  user_id: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}

export async function POST(req: Request) {
  const { access_token, state } = await req.json() as {
    access_token: string;
    state?: string;
  };

  if (!access_token) {
    return NextResponse.json({ error: 'missing access_token' }, { status: 400 });
  }

  // VK ID v3 — используем id.vk.com/oauth2/user_info (не api.vk.com)
  const userInfoRes = await fetch('https://id.vk.com/oauth2/user_info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.VK_APP_ID!,
      access_token,
    }),
  });

  const userInfoData = await userInfoRes.json();
  const vkUser: VkUserInfo | undefined = userInfoData?.user;

  if (!vkUser?.user_id) {
    console.error('VK user_info error:', JSON.stringify(userInfoData));
    return NextResponse.json({ error: 'vk_user_info_failed' }, { status: 401 });
  }

  const vkId = String(vkUser.user_id);
  const name = [vkUser.first_name, vkUser.last_name].filter(Boolean).join(' ') || 'VK User';
  const photo = vkUser.avatar ?? null;

  // Найти или создать профиль
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('vk_id', vkId)
    .maybeSingle();

  let profileId: string;
  let isNew = false;

  if (existing) {
    profileId = existing.id;
    await supabaseAdmin.from('profiles').update({ name, telegram_photo: photo }).eq('id', profileId);
  } else {
    const { data: created, error } = await supabaseAdmin
      .from('profiles')
      .insert({ id: crypto.randomUUID(), vk_id: vkId, name, telegram_photo: photo, phone: null })
      .select('id')
      .single();

    if (error || !created) {
      return NextResponse.json({ error: `db: ${error?.message}` }, { status: 500 });
    }
    profileId = created.id;
    isNew = true;
  }

  const token = await createUserToken(profileId, process.env.ADMIN_SECRET!);
  const redirectTo = state === 'booking' ? '/booking?restore=1' : '/profile';

  const res = NextResponse.json({ redirectTo });
  res.cookies.set('user_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
