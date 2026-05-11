import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelPayment } from '@/lib/tinkoff';

export async function POST(req: Request) {
  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('payment_id, prepaid_amount, payment_status')
      .eq('id', appointmentId)
      .single();

    if (!appointment) return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });
    if (appointment.payment_status === 'refunded') return NextResponse.json({ error: 'Возврат уже был выполнен' }, { status: 400 });
    if (!appointment.payment_id) return NextResponse.json({ error: 'Нет данных об оплате' }, { status: 400 });
    if (!appointment.prepaid_amount) return NextResponse.json({ error: 'Нечего возвращать' }, { status: 400 });

    const ok = await cancelPayment(appointment.payment_id, appointment.prepaid_amount);
    if (!ok) return NextResponse.json({ error: 'Tinkoff не подтвердил возврат' }, { status: 502 });

    await supabaseAdmin
      .from('appointments')
      .update({ payment_status: 'refunded' })
      .eq('id', appointmentId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Refund error:', err);
    return NextResponse.json({ error: err.message ?? 'Ошибка возврата' }, { status: 500 });
  }
}
