import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { format, addDays, startOfToday } from 'date-fns';
import { ru } from 'date-fns/locale';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

export async function POST(req: Request) {
  if (!TELEGRAM_TOKEN) {
    return NextResponse.json({ error: 'Telegram token not set' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { message, callback_query } = body;

    if (message) {
      const chatId = message.chat.id;
      const text = message.text;

      if (text === '/start') {
        await sendTelegramMessage(chatId, 'Добро пожаловать в BABEBAR! 🌟\n\nЯ помогу вам записаться на наши услуги. Выберите действие ниже:', {
          inline_keyboard: [
            [{ text: '💅 Посмотреть услуги', callback_data: 'view_services' }],
            [{ text: '📅 Мои записи', callback_data: 'my_appointments' }]
          ]
        });
      }
    }

    if (callback_query) {
      const chatId = callback_query.message.chat.id;
      const data = callback_query.data;
      const messageId = callback_query.message.message_id;

      // 1. Показ списка услуг
      if (data === 'view_services') {
        const { data: services } = await supabaseAdmin.from('services').select('*').eq('is_active', true);
        if (services) {
          const buttons = services.map(s => ([{
            text: `${s.name} - ${s.price} ₽`,
            callback_data: `select_date:${s.id}`
          }]));
          await editTelegramMessage(chatId, messageId, 'Выберите услугу для записи:', { inline_keyboard: buttons });
        }
      }

      // 2. Выбор даты
      if (data.startsWith('select_date:')) {
        const serviceId = data.split(':')[1];
        const today = startOfToday();
        const buttons = [];
        
        for (let i = 0; i < 7; i++) {
          const date = addDays(today, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const displayDate = format(date, 'eeee, d MMMM', { locale: ru });
          buttons.push([{ text: displayDate, callback_data: `select_time:${serviceId}:${dateStr}` }]);
        }
        
        buttons.push([{ text: '⬅️ Назад к услугам', callback_data: 'view_services' }]);
        await editTelegramMessage(chatId, messageId, 'Выберите удобный день:', { inline_keyboard: buttons });
      }

      // 3. Выбор времени (упрощенно: пока просто список часов)
      if (data.startsWith('select_time:')) {
        const [, serviceId, dateStr] = data.split(':');
        const times = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
        
        const buttons = [];
        for (let i = 0; i < times.length; i += 2) {
          const row = [
            { text: times[i], callback_data: `confirm:${serviceId}:${dateStr}:${times[i]}` }
          ];
          if (times[i+1]) {
            row.push({ text: times[i+1], callback_data: `confirm:${serviceId}:${dateStr}:${times[i+1]}` });
          }
          buttons.push(row);
        }
        
        buttons.push([{ text: '⬅️ Изменить дату', callback_data: `select_date:${serviceId}` }]);
        await editTelegramMessage(chatId, messageId, `Вы выбрали ${format(new Date(dateStr), 'd MMMM', { locale: ru })}. Выберите время:`, { inline_keyboard: buttons });
      }

      // 4. Подтверждение (пока просто заглушка)
      if (data.startsWith('confirm:')) {
        const [, serviceId, dateStr, time] = data.split(':');
        const { data: service } = await supabaseAdmin.from('services').select('name').eq('id', serviceId).single();
        
        await editTelegramMessage(chatId, messageId, `✅ Вы выбрали:\n🔹 *${service?.name}*\n📅 *${format(new Date(dateStr), 'd MMMM', { locale: ru })} в ${time}*\n\nПожалуйста, отправьте ваш номер телефона, чтобы мы могли связаться с вами для подтверждения записи.`, {
          parse_mode: 'Markdown',
          inline_keyboard: [[{ text: '🏠 В начало', callback_data: 'start_over' }]]
        });
      }

      if (data === 'start_over') {
        await editTelegramMessage(chatId, messageId, 'Что вы хотите сделать?', {
          inline_keyboard: [
            [{ text: '💅 Посмотреть услуги', callback_data: 'view_services' }],
            [{ text: '📅 Мои записи', callback_data: 'my_appointments' }]
          ]
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup }),
  });
}

async function editTelegramMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, reply_markup: replyMarkup }),
  });
}
