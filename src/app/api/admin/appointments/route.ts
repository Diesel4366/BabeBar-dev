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
      .select(`
        *,
        profiles (name, telegram_id, telegram_chat_id),
        appointment_services (services (name))
      `)
      .single();

    if (error) throw error;

    // Уведомляем клиента в Telegram
    const telegramToken = process.env.TELEGRAM_TOKEN;
    if (telegramToken && data) {
      const profile = data.profiles as any;
      const chatId = profile?.telegram_chat_id || profile?.telegram_id;

      if (chatId) {
        const serviceNames = (data.appointment_services as any[])
          ?.map((s: any) => s.services?.name)
          .filter(Boolean)
          .join(', ') || 'Услуга';

        const dateFormatted = new Date(data.date + 'T12:00:00').toLocaleDateString('ru-RU', {
          day: 'numeric', month: 'long', weekday: 'long',
        });

        let message = '';

        if (status === 'cancelled_by_admin') {
          message = `❌ *Запись отменена*\n\n📅 *Дата:* ${dateFormatted}\n⏰ *Время:* ${data.start_time.substring(0, 5)} — ${data.end_time.substring(0, 5)}\n💅 *Услуги:* ${serviceNames}\n\nЕсли хотите записаться на другое время — просто напишите нам 🌸`;
        } else if (status === 'completed') {
          message = `✅ *Визит завершён!*\n\nСпасибо, что выбрали нас 🌸\n💅 *Услуги:* ${serviceNames}\n\nБудем рады видеть вас снова!`;
        }

        if (message) {
          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
          });
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
