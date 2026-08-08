import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const excludeId = searchParams.get('excludeId');

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    // Занятые интервалы
    let query = supabaseAdmin
      .from('appointments')
      .select('start_time, end_time')
      .eq('date', date)
      .in('status', ['active', 'pending_payment']);

    if (excludeId) query = query.neq('id', excludeId);

    const { data: appointments, error } = await query;

    if (error) throw error;

    const occupiedIntervals = appointments.map(app => ({
      start: app.start_time.substring(0, 5),
      end: app.end_time.substring(0, 5),
    }));

    const [{ data: exception }, { data: rule }] = await Promise.all([
      supabaseAdmin
        .from('schedule_exceptions')
        .select('is_working, start_time, end_time')
        .eq('date', date)
        .maybeSingle(),
      supabaseAdmin
        .from('schedule_rules')
        .select('is_working, start_time, end_time')
        // PostgreSQL day_of_week: 0=Sunday…6=Saturday
        .eq('day_of_week', new Date(date + 'T12:00:00').getDay())
        .maybeSingle(),
    ]);

    let workingHours: { start: string; end: string } | null = null;

    if (exception) {
      // Explicit exception overrides the regular schedule (including day-off exceptions)
      if (exception.is_working && exception.start_time && exception.end_time) {
        workingHours = {
          start: exception.start_time.substring(0, 5),
          end: exception.end_time.substring(0, 5),
        };
      }
    } else if (rule && rule.is_working && rule.start_time && rule.end_time) {
      // No exception for this date — use the regular weekly schedule
      workingHours = {
        start: rule.start_time.substring(0, 5),
        end: rule.end_time.substring(0, 5),
      };
    }

    return NextResponse.json({ occupiedIntervals, workingHours });
  } catch {
    return NextResponse.json({ error: 'Не удалось загрузить доступность' }, { status: 500 });
  }
}
