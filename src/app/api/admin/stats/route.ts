import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminToken } from '@/lib/auth';
async function checkAuth(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  const cookie = req.headers.get('cookie') || '';
  const session = cookie.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];
  return !(!session || !secret || !(await verifyAdminToken(session, secret)));
}
import { format } from 'date-fns';

export async function GET(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(now);
    const monthStart = today.substring(0, 7) + '-01';

    const [todayRes, clientsRes, revenueRes] = await Promise.all([
      supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .in('status', ['active', 'completed']),
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart),
      supabaseAdmin
        .from('appointments')
        .select('total_price')
        .gte('date', monthStart)
        .in('status', ['active', 'completed']),
    ]);

    const monthRevenue = revenueRes.data?.reduce(
      (sum, a) => sum + (a.total_price || 0), 0
    ) ?? 0;

    return NextResponse.json({
      todayAppointments: todayRes.count ?? 0,
      monthClients: clientsRes.count ?? 0,
      monthRevenue,
    });
  } catch {
    return NextResponse.json({ todayAppointments: 0, monthClients: 0, monthRevenue: 0 });
  }
}
