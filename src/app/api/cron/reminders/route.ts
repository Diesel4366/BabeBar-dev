import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const TOKEN = process.env.TELEGRAM_TOKEN;
// Салон работает в UTC+3 (Москва)
const TZ_OFFSET_H = 3;

async function sendMsg(chatId: string | number, text: string) {
  if (!TOKEN) return null;
  return fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

function toLocalDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() + TZ_OFFSET_H * 60 * 60 * 1000);
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function serviceNames(app: any): string {
  return (app.appointment_services as any[])
    .map((s: any) => s.services?.name)
    .filter(Boolean)
    .join(', ');
}

const SELECT = `
  id, start_time, date,
  reminder_sent, reminder_morning_sent, reminder_day_before_sent,
  profiles ( id, name, telegram_chat_id, telegram_id ),
  appointment_services ( services ( name ) )
`;

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TOKEN) return NextResponse.json({ error: 'Telegram token not set' }, { status: 500 });

  const nowUtc = new Date();
  const nowLocal = toLocalDate(nowUtc);
  const localHour = nowLocal.getUTCHours();
  const todayStr = formatDate(nowLocal);

  const tomorrowLocal = new Date(nowLocal);
  tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);
  const tomorrowStr = formatDate(tomorrowLocal);

  const results = { dayBefore: 0, morning: 0, hourBefore: 0, errors: [] as string[] };

  // ── 1. За день до записи (отправляем 9:00–10:59 по Москве) ───────────
  if (localHour >= 9 && localHour < 11) {
    const { data: apps } = await supabaseAdmin
      .from('appointments')
      .select(SELECT)
      .eq('date', tomorrowStr)
      .eq('status', 'active')
      .eq('reminder_day_before_sent', false);

    for (const app of apps ?? []) {
      try {
        const profile = app.profiles as any;
        const chatId = profile?.telegram_chat_id || profile?.telegram_id;
        if (!chatId) continue;

        const time = (app.start_time as string).slice(0, 5);
        const name = profile.name?.split(' ')[0] ?? '';
        const text =
          `📅 <b>${name ? name + ', напоминаем!' : 'Напоминание!'}</b>\n\n` +
          `Завтра в <b>${time}</b> ждём вас на:\n💅 ${serviceNames(app)}\n\n` +
          `Ждём вас в <b>BABEBAR</b>! Если планы изменились — дайте знать заранее 🙏`;

        const res = await sendMsg(chatId, text);
        if (res?.ok) {
          await supabaseAdmin.from('appointments').update({ reminder_day_before_sent: true }).eq('id', app.id);
          results.dayBefore++;
        }
      } catch (e: any) {
        results.errors.push(`dayBefore ${app.id}: ${e.message}`);
      }
    }
  }

  // ── 2. Утро в день записи (9:00–10:59 по Москве) ─────────────────────
  if (localHour >= 9 && localHour < 11) {
    const { data: apps } = await supabaseAdmin
      .from('appointments')
      .select(SELECT)
      .eq('date', todayStr)
      .eq('status', 'active')
      .eq('reminder_morning_sent', false);

    for (const app of apps ?? []) {
      try {
        const profile = app.profiles as any;
        const chatId = profile?.telegram_chat_id || profile?.telegram_id;
        if (!chatId) continue;

        const time = (app.start_time as string).slice(0, 5);
        const name = profile.name?.split(' ')[0] ?? '';
        const text =
          `☀️ <b>Доброе утро${name ? ', ' + name : ''}!</b>\n\n` +
          `Сегодня в <b>${time}</b> ждём вас на:\n💅 ${serviceNames(app)}\n\n` +
          `До встречи в <b>BABEBAR</b>! ✨`;

        const res = await sendMsg(chatId, text);
        if (res?.ok) {
          await supabaseAdmin.from('appointments').update({ reminder_morning_sent: true }).eq('id', app.id);
          results.morning++;
        }
      } catch (e: any) {
        results.errors.push(`morning ${app.id}: ${e.message}`);
      }
    }
  }

  // ── 3. За час до записи (50–80 минут до старта) ───────────────────────
  const in50min = new Date(nowLocal.getTime() + 50 * 60 * 1000);
  const in80min = new Date(nowLocal.getTime() + 80 * 60 * 1000);
  const timeFrom = in50min.toISOString().slice(11, 19);
  const timeTo   = in80min.toISOString().slice(11, 19);

  const { data: appsHour } = await supabaseAdmin
    .from('appointments')
    .select(SELECT)
    .eq('date', todayStr)
    .eq('status', 'active')
    .eq('reminder_sent', false)
    .gte('start_time', timeFrom)
    .lte('start_time', timeTo);

  for (const app of appsHour ?? []) {
    try {
      const profile = app.profiles as any;
      const chatId = profile?.telegram_chat_id || profile?.telegram_id;
      if (!chatId) continue;

      const time = (app.start_time as string).slice(0, 5);
      const name = profile.name?.split(' ')[0] ?? '';
      const text =
        `⏰ <b>${name ? name + ', совсем скоро!' : 'Совсем скоро!'}</b>\n\n` +
        `Через час в <b>${time}</b> ждём вас на:\n💅 ${serviceNames(app)}\n\n` +
        `<b>BABEBAR</b>, ул. Головнина, д.35 📍`;

      const res = await sendMsg(chatId, text);
      if (res?.ok) {
        await supabaseAdmin.from('appointments').update({ reminder_sent: true }).eq('id', app.id);
        results.hourBefore++;
      }
    } catch (e: any) {
      results.errors.push(`hourBefore ${app.id}: ${e.message}`);
    }
  }

  return NextResponse.json(results);
}
