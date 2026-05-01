import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/userAuth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`
      id, date, start_time, end_time, status, total_price, created_at,
      appointment_services(
        services(name, price, duration_minutes)
      )
    `)
    .eq('client_id', profileId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function DELETE(req: Request) {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: appt } = await supabaseAdmin
    .from('appointments')
    .select('id, client_id, date, status')
    .eq('id', id)
    .eq('client_id', profileId)
    .single();

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (appt.status !== 'active') return NextResponse.json({ error: 'Cannot cancel' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled_by_client' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
