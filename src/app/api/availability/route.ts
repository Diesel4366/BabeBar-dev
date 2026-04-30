import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('start_time')
      .eq('date', date)
      .eq('status', 'active');

    if (error) throw error;

    const occupiedSlots = appointments.map(app => {
      // Преобразуем "10:00:00" в "10:00"
      return app.start_time.substring(0, 5);
    });

    return NextResponse.json({ occupiedSlots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
