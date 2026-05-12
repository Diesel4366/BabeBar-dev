import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data } = await supabaseAdmin
    .from('appointments')
    .select('status, payment_status, date, start_time, total_price, prepaid_amount, appointment_services ( services ( name ) )')
    .eq('id', id)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const raw = data as unknown as {
    status: string; payment_status: string; date: string;
    start_time: string; total_price: number; prepaid_amount: number;
    appointment_services: { services: { name: string } | { name: string }[] | null }[];
  };
  const services = (raw.appointment_services ?? []).map(as => {
    const s = as.services;
    if (!s) return null;
    if (Array.isArray(s)) return s[0]?.name ?? null;
    return (s as { name: string }).name;
  }).filter(Boolean) as string[];

  return NextResponse.json({
    status: data.status,
    paymentStatus: data.payment_status,
    date: data.date,
    startTime: data.start_time,
    totalPrice: data.total_price,
    prepaidAmount: raw.prepaid_amount ?? 0,
    services,
  });
}
