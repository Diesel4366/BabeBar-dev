import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    // Занятые интервалы
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('start_time, end_time')
      .eq('date', date)
      .eq('status', 'active');

    if (error) throw error;

    const occupiedIntervals = appointments.map(app => ({
      start: app.start_time.substring(0, 5),
      end: app.end_time.substring(0, 5),
    }));

    const { data: exception } = await supabaseAdmin
      .from('schedule_exceptions')
      .select('*')
      .eq('date', date)
      .maybeSingle();

    let workingHours: { start: string; end: string } | null = null;

    if (exception && exception.is_working && exception.start_time && exception.end_time) {
      workingHours = {
        start: exception.start_time.substring(0, 5),
        end: exception.end_time.substring(0, 5),
      };
    }

    return NextResponse.json({ occupiedIntervals, workingHours });
  } catch {
    return NextResponse.json({ error: 'Не удалось загрузить доступность' }, { status: 500 });
  }
}
