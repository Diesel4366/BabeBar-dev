import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getPaymentState } from '@/lib/tinkoff';
import { sendBookingNotifications } from '@/lib/booking-notifications';

export async function POST(req: Request) {
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

      // Отправляем уведомления только если запись реально перешла в active
      // (eq status='pending_payment' защищает от повторной отправки при двойном вызове)
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
