import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/userAuth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(req: Request) {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, birthday } = await req.json();
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (birthday !== undefined) updates.birthday = birthday || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', profileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
