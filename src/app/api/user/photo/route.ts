import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/userAuth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (!token) return new Response(null, { status: 401 });

  const profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);
  if (!profileId) return new Response(null, { status: 401 });

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('telegram_photo')
    .eq('id', profileId)
    .single();

  const url = data?.telegram_photo;
  if (!url) return new Response(null, { status: 404 });

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' ||
        /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(parsed.hostname)) {
      return new Response(null, { status: 403 });
    }
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return new Response(null, { status: 404 });

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('photo') as File | null;
  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${profileId}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);

  await supabaseAdmin.from('profiles').update({ telegram_photo: publicUrl }).eq('id', profileId);

  return NextResponse.json({ url: publicUrl });
}
