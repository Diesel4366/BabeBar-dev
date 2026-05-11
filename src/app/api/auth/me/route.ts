import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/userAuth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (!token) return NextResponse.json(null);

  const profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);
  if (!profileId) return NextResponse.json(null);

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, name, phone, telegram_id, oidc_id, telegram_username, telegram_photo, created_at, birthday')
    .eq('id', profileId)
    .single();

  if (!data) return NextResponse.json(null);

  const isAdmin = data.telegram_id?.toString() === process.env.ADMIN_TELEGRAM_ID;
  return NextResponse.json({ ...data, isAdmin });
}
