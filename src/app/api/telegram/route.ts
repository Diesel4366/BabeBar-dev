import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

export async function POST(req: Request) {
  console.log('--- Telegram Webhook Received ---');
  
  if (!TELEGRAM_TOKEN) {
    console.error('ERROR: TELEGRAM_TOKEN is not defined in environment variables');
    return NextResponse.json({ error: 'Telegram token not set' }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log('Webhook Body:', JSON.stringify(body, null, 2));
    
    const { message, callback_query } = body;

    // Обработка текстовых сообщений
    if (message) {
      const chatId = message.chat.id;
      const text = message.text;
      console.log(`Message from \${chatId}: \${text}`);

      if (text === '/start') {
        const response = await sendTelegramMessage(chatId, 'Добро пожаловать в BABEBAR! 🌟\n\nЯ помогу вам записаться на наши услуги. Выберите действие ниже:', {
          inline_keyboard: [
            [{ text: '💅 Посмотреть услуги', callback_data: 'view_services' }],
            [{ text: '📅 Мои записи', callback_data: 'my_appointments' }]
          ]
        });
        console.log('Telegram API Response:', response);
      }
    }

    // Обработка нажатий на кнопки
    if (callback_query) {
      const chatId = callback_query.message.chat.id;
      const data = callback_query.data;
      console.log(`Callback from \${chatId}: \${data}`);

      if (data === 'view_services') {
        const { data: services, error: dbError } = await supabaseAdmin
          .from('services')
          .select('*')
          .eq('is_active', true);

        if (dbError) {
          console.error('Database Error:', dbError);
        }

        if (services && services.length > 0) {
          const buttons = services.map(s => ([{
            text: `\${s.name} - \${s.price} ₽`,
            callback_data: `service_\${s.id}`
          }]));
          
          await sendTelegramMessage(chatId, 'Выберите интересующую вас услугу:', {
            inline_keyboard: buttons
          });
        } else {
          await sendTelegramMessage(chatId, 'К сожалению, услуг пока нет.');
        }
      }

      if (data.startsWith('service_')) {
        await sendTelegramMessage(chatId, 'Вы выбрали услугу. В данный момент я настраиваю календарь для выбора даты. Скоро всё заработает!');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('CRITICAL Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot\${TELEGRAM_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text: text,
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return await res.json();
}
