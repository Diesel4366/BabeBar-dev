import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        client:profiles(name, phone, telegram_username),
        services:appointment_services(
          service:services(id, name, price, duration_minutes)
        )
      `)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) throw error;

    // Форматируем данные для удобства фронтенда
    const formattedData = data.map((app: any) => ({
      id: app.id,
      date: app.date,
      startTime: app.start_time,
      endTime: app.end_time,
      status: app.status,
      totalPrice: app.total_price,
      client: app.client,
      services: app.services.map((s: any) => s.service)
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error('Admin appointments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
