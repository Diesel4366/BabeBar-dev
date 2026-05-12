import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createUserToken } from '@/lib/userAuth';

export async function POST(req: Request) {
  const { access_token, user_id, state } = await req.json() as {
    access_token: string;
    user_id: number;
    state?: string;
  };

  if (!access_token || !user_id) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  // Проверяем токен через VK API и получаем данные пользователя
  const apiRes = await fetch(
    `https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_100&access_token=${access_token}&v=5.131`
  );
  const apiData = await apiRes.json();
  const vkUser = apiData?.response?.[0];

  if (!vkUser || String(vkUser.id) !== String(user_id)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  const vkId = String(vkUser.id);
  const name = [vkUser.first_name, vkUser.last_name].filter(Boolean).join(' ');
  const photo = vkUser.photo_100 ?? null;

  // Найти или создать профиль
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

    if (error || !created) {
      return NextResponse.json({ error: `db: ${error?.message}` }, { status: 500 });
    }
    profileId = created.id;
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
