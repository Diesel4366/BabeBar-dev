import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/schedule?month=YYYY-MM → exceptions for the month
export async function GET(req: Request) {
  const month = new URL(req.url).searchParams.get('month');
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 });

  const from = `${month}-01`;
  const to = `${month}-31`;

  const { data, error } = await supabaseAdmin
    .from('schedule_exceptions')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/schedule → upsert exception { date, is_working, start_time?, end_time? }
export async function POST(req: Request) {
  const { date, is_working, start_time, end_time } = await req.json();
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('schedule_exceptions')
    .select('id')
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('schedule_exceptions')
      .update({ is_working, start_time: start_time ?? null, end_time: end_time ?? null })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    const { data, error } = await supabaseAdmin
      .from('schedule_exceptions')
      .insert({ date, is_working, start_time: start_time ?? null, end_time: end_time ?? null })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }
}

// DELETE /api/admin/schedule?date=YYYY-MM-DD → remove exception (revert to default)
export async function DELETE(req: Request) {
  const date = new URL(req.url).searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('schedule_exceptions')
    .delete()
    .eq('date', date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
