import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdminAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;

  const [{ data: client, error: clientError }, { data: appointments, error: apptError }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, name, phone, nickname, telegram_username, telegram_id, vk_id, created_at, birthday')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('appointments')
      .select('id, date, start_time, status, total_price, appointment_services ( services ( id, name ) )')
      .eq('client_id', id)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false }),
  ]);

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });
  if (!client) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 500 });

  const formatted = (appointments ?? []).map(a => ({
    id: a.id,
    date: a.date,
    startTime: a.start_time,
    status: a.status,
    totalPrice: a.total_price,
    services: (a.appointment_services as unknown as { services: { id: string; name: string } | null }[])
      .map(s => s.services)
      .filter(Boolean),
  }));

  return NextResponse.json({ client, appointments: formatted });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdminAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    phone?: string;
    nickname?: string;
    telegram_username?: string;
    telegram_id?: string;
    vk_id?: string;
  };

  const update: Record<string, string | null> = {};
  for (const key of ['name', 'phone', 'nickname', 'telegram_username', 'telegram_id', 'vk_id'] as const) {
    if (key in body) update[key] = body[key] || null;
  }

  const { error } = await supabaseAdmin.from('profiles').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
