import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { getPaymentState } from '@/lib/tinkoff';
import { sendBookingNotifications } from '@/lib/booking-notifications';
import { verifyUserToken } from '@/lib/userAuth';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: Request) {
  const store = await cookies();
  const secret = process.env.ADMIN_SECRET!;
  const userToken = store.get('user_session')?.value;
  const adminToken = store.get('admin_session')?.value;
  const isUser = userToken ? !!(await verifyUserToken(userToken, secret)) : false;
  const isAdmin = adminToken ? !!(await verifyAdminToken(adminToken, secret)) : false;
  if (!isUser && !isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('payment_id, payment_status')
      .eq('id', appointmentId)
      .single();

    if (!appointment?.payment_id) {
      return NextResponse.json({ error: 'Нет данных об оплате' }, { status: 400 });
    }

    const tinkoffStatus = await getPaymentState(appointment.payment_id);
    if (!tinkoffStatus) {
      return NextResponse.json({ error: 'Не удалось получить статус от Tinkoff' }, { status: 502 });
    }

    if (tinkoffStatus === 'CONFIRMED') {
      const { data: updated } = await supabaseAdmin
        .from('appointments')
        .update({ status: 'active', payment_status: 'paid' })
        .eq('id', appointmentId)
        .eq('status', 'pending_payment')
        .select('id')
        .maybeSingle();

      if (updated) {
        await sendBookingNotifications(appointmentId);
      }
      return NextResponse.json({ result: 'paid' });
    }

    if (['REJECTED', 'CANCELLED', 'DEADLINE_EXPIRED'].includes(tinkoffStatus)) {
      await supabaseAdmin
        .from('appointments')
        .update({ status: 'cancelled_by_client', payment_status: 'failed' })
        .eq('id', appointmentId)
        .eq('status', 'pending_payment');
      return NextResponse.json({ result: 'failed' });
    }

    return NextResponse.json({ result: 'pending', tinkoffStatus });
  } catch (err: any) {
    console.error('Check payment error:', err);
    return NextResponse.json({ error: err.message ?? 'Ошибка проверки' }, { status: 500 });
  }
}
