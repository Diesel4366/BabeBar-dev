import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { format, addHours, startOfMinute } from 'date-fns';
import { ru } from 'date-fns/locale';

const TOKEN = process.env.TELEGRAM_TOKEN;

async function sendMsg(chatId: string | number, text: string) {
  if (!TOKEN) return;
  return fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export async function GET(req: Request) {
  // Проверка безопасности согласно инструкции Vercel
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TOKEN) {
    return NextResponse.json({ error: 'Telegram token not set' }, { status: 500 });
  }

  try {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    
    // Ищем записи на ближайшие 2 часа. 
    // Поскольку крон запускается раз в час, мы берем запас, 
    // чтобы точно попасть в интервал.
    const startTimeMin = format(now, 'HH:mm:ss');
    const startTimeMax = format(addHours(now, 2.1), 'HH:mm:ss');

    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        id, 
        start_time, 
        date,
        profiles (
          id, 
          name, 
          telegram_chat_id,
          telegram_id
        ),
        appointment_services (
          services (name)
        )
      `)
      .eq('date', todayStr)
      .eq('status', 'active')
      .eq('reminder_sent', false)
      .gte('start_time', startTimeMin)
      .lte('start_time', startTimeMax);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ message: 'No appointments to remind' });
    }

    const results = [];

    for (const app of appointments) {
      const profile = app.profiles as any;
      const chatId = profile?.telegram_chat_id || profile?.telegram_id;

      if (chatId) {
        const services = (app.appointment_services as any[])
          .map(s => s.services?.name)
          .filter(Boolean)
          .join(', ');

        const time = app.start_time.substring(0, 5);
        const text = `🌟 *Напоминание от BABEBAR!*\n\nСегодня в *${time}* ждём вас на услуги:\n💅 ${services}\n\nДо встречи! ✨`;

        const res = await sendMsg(chatId, text);
        if (res?.ok) {
          await supabaseAdmin
            .from('appointments')
            .update({ reminder_sent: true })
            .eq('id', app.id);
          
          results.push({ id: app.id, status: 'sent' });
        } else {
          results.push({ id: app.id, status: 'error', tg_res: await res?.json() });
        }
      } else {
        results.push({ id: app.id, status: 'no_chat_id' });
      }
    }

    return NextResponse.json({ processed: appointments.length, results });
  } catch (error: any) {
    console.error('Reminder Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
