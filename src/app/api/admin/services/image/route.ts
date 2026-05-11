import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminToken } from '@/lib/auth';

async function checkAuth(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  const cookie = req.headers.get('cookie') || '';
  const session = cookie.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];
  return !(!session || !secret || !(await verifyAdminToken(session, secret)));
}

export async function POST(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  const serviceId = formData.get('serviceId') as string | null;

  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const name = serviceId ? `${serviceId}.${ext}` : `${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error } = await supabaseAdmin.storage
    .from('service-images')
    .upload(name, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage.from('service-images').getPublicUrl(name);

  return NextResponse.json({ url: `${publicUrl}?t=${Date.now()}` });
}
