import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelPayment, TinkoffReceipt } from '@/lib/tinkoff';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(req: Request) {
  const store = await cookies();
  const adminToken = store.get('admin_session')?.value;
  const secret = process.env.ADMIN_SECRET!;
  const isAdmin = adminToken ? !!(await verifyAdminToken(adminToken, secret)) : false;
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select(`
        payment_id, prepaid_amount, payment_status,
        client:profiles(phone),
        services:appointment_services(service:services(name, price))
      `)
      .eq('id', appointmentId)
      .single();

    if (!appointment) return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });
    if (appointment.payment_status === 'refunded') return NextResponse.json({ error: 'Возврат уже был выполнен' }, { status: 400 });
    if (!appointment.payment_id) return NextResponse.json({ error: 'Нет данных об оплате' }, { status: 400 });
    if (!appointment.prepaid_amount) return NextResponse.json({ error: 'Нечего возвращать' }, { status: 400 });

    const taxation = process.env.TINKOFF_TAXATION ?? 'usn_income';
    const refundAmount = appointment.prepaid_amount;
    const services = (appointment.services as any[]).map(s => s.service).filter(Boolean);

    const receipt: TinkoffReceipt = {
      Phone: (appointment.client as any)?.phone,
      Taxation: taxation,
      Items: [{
        Name: services.length > 0
          ? `Возврат: ${services.map((s: any) => s.name).join(', ')}`.slice(0, 128)
          : 'Возврат оплаты',
        Price: Math.round(refundAmount * 100),
        Quantity: 1,
        Amount: Math.round(refundAmount * 100),
        PaymentMethod: 'full_payment',
        PaymentObject: 'service',
        Tax: 'none',
      }],
    };

    const ok = await cancelPayment(appointment.payment_id, refundAmount, receipt);
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
