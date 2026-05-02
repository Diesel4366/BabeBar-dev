import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/userAuth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`
      id, date, start_time, end_time, status, total_price, created_at,
      appointment_services(
        services(name, price, duration_minutes)
      )
    `)
    .eq('client_id', profileId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function DELETE(req: Request) {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: appt } = await supabaseAdmin
    .from('appointments')
    .select(`
      id, date, start_time, status,
      profiles(name, phone, telegram_username),
      appointment_services(services(name))
    `)
    .eq('id', id)
    .eq('client_id', profileId)
    .single();

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (appt.status !== 'active') return NextResponse.json({ error: 'Cannot cancel' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled_by_client' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Уведомление мастерам об отмене
  const telegramToken = process.env.TELEGRAM_TOKEN;
  const rawChatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '';
  const chatIds = rawChatIds.split(',').map(s => s.trim()).filter(Boolean);

  if (telegramToken && chatIds.length > 0) {
    try {
      const client = (appt as any).profiles;
      const dateFormatted = new Date(appt.date + 'T12:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', weekday: 'long',
      });
      const services = (appt as any).appointment_services
        .map((s: any) => s.services?.name).filter(Boolean).join(', ');

      let message = `🔴 *ОТМЕНА ЗАПИСИ!*\n\n👤 *Клиент:* ${client?.name || '—'}\n📞 *Телефон:* ${client?.phone || '—'}`;
      if (client?.telegram_username) {
        message += `\n✈️ *Telegram:* @${client.telegram_username}`;
      }
      message += `\n📅 *Дата:* ${dateFormatted}\n⏰ *Время:* ${appt.start_time.substring(0, 5)}\n💅 *Услуги:* ${services}`;

      await Promise.allSettled(chatIds.map(chatId =>
        fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
        })
      ));
    } catch (e) {
      console.error('Failed to send cancel notification:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
