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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (!from || !to) {
      return NextResponse.json({ error: 'from и to обязательны' }, { status: 400 });
    }

    const [apptsRes, servicesRes] = await Promise.all([
      supabaseAdmin
        .from('appointments')
        .select('id, client_id, total_price')
        .eq('status', 'completed')
        .gte('date', from)
        .lte('date', to),
      supabaseAdmin
        .from('appointment_services')
        .select('service_id, services ( id, name, price ), appointments!inner ( date, status )')
        .eq('appointments.status', 'completed')
        .gte('appointments.date', from)
        .lte('appointments.date', to),
    ]);

    if (apptsRes.error) throw apptsRes.error;
    if (servicesRes.error) throw servicesRes.error;

    const appts = apptsRes.data ?? [];
    const totalRevenue = appts.reduce((sum, a) => sum + (a.total_price || 0), 0);
    const totalAppointments = appts.length;
    const uniqueClients = new Set(appts.map(a => a.client_id).filter(Boolean)).size;
    const avgCheck = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

    const byService = new Map<string, { id: string; name: string; count: number; revenue: number }>();
    for (const row of servicesRes.data ?? []) {
      const svc = row.services as unknown as { id: string; name: string; price: number } | null;
      if (!svc) continue;
      const entry = byService.get(svc.id) ?? { id: svc.id, name: svc.name, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += svc.price || 0;
      byService.set(svc.id, entry);
    }
    const services = Array.from(byService.values()).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ totalRevenue, totalAppointments, uniqueClients, avgCheck, services });
  } catch (error: unknown) {
    console.error('Reports overview error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
