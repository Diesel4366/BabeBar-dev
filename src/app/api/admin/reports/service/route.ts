import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminToken } from '@/lib/auth';

async function checkAuth(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  const cookie = req.headers.get('cookie') || '';
  const session = cookie.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];
  return !(!session || !secret || !(await verifyAdminToken(session, secret)));
}

export async function GET(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!serviceId || !from || !to) {
      return NextResponse.json({ error: 'serviceId, from и to обязательны' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        id, date, start_time, status, total_price, client_id,
        profiles ( name, phone, telegram_username ),
        appointment_services!inner ( service_id )
      `)
      .eq('appointment_services.service_id', serviceId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []).map(a => ({
      id: a.id,
      date: a.date,
      startTime: a.start_time,
      status: a.status,
      totalPrice: a.total_price,
      clientId: a.client_id,
      client: a.profiles as unknown as { name: string; phone: string; telegram_username: string | null } | null,
    }));

    return NextResponse.json(rows);
  } catch (error: unknown) {
    console.error('Reports service history error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
