import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns working days in range: { date, start_time, end_time }[]
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('schedule_exceptions')
    .select('date, start_time, end_time')
    .eq('is_working', true)
    .gte('date', from)
    .lte('date', to)
    .order('date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
