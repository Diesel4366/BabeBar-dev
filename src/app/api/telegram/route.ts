import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { format, addDays, startOfToday } from 'date-fns';
import { ru } from 'date-fns/locale';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

async function fetchAndStoreAvatar(telegramId: number, profileId: string): Promise<string | null> {
  if (!TELEGRAM_TOKEN) return null;
  try {
    const r1 = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const d1 = await r1.json();
    if (!d1.ok || !d1.result?.photos?.[0]?.length) return null;

    const sizes = d1.result.photos[0];
    const fileId = sizes[sizes.length - 1].file_id;

    const r2 = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
    const d2 = await r2.json();
    if (!d2.ok || !d2.result?.file_path) return null;

    const photoRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${d2.result.file_path}`);
    if (!photoRes.ok) return null;

    const buffer = await photoRes.arrayBuffer();
    const { error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(`${profileId}.jpg`, buffer, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;

    const { data: { publicUrl } } = supabaseAdmin.storage.from('avatars').getPublicUrl(`${profileId}.jpg`);
    return publicUrl;
  } catch {
    return null;
  }
}

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
      const telegramId = message.from?.id;

      if (text === '/start') {
        await sendTelegramMessage(chatId, 'Добро пожаловать в BABEBAR! 🌟\n\nЯ помогу вам записаться на наши услуги. Выберите действие ниже:', {
          inline_keyboard: [
            [{ text: '💅 Посмотреть услуги', callback_data: 'view_services' }],
            [{ text: '📅 Мои записи', callback_data: 'my_appointments' }]
          ]
        });

        if (telegramId) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, telegram_photo, phone')
            .eq('telegram_id', String(telegramId))
            .maybeSingle();

          if (profile) {
            // Загружаем фото если нет
            if (!profile.telegram_photo) {
              const photoUrl = await fetchAndStoreAvatar(telegramId, profile.id);
              if (photoUrl) {
                await supabaseAdmin.from('profiles').update({ telegram_photo: photoUrl }).eq('id', profile.id);
              }
            }
            // Запрашиваем телефон если не заполнен
            if (!profile.phone) {
              await sendTelegramMessage(chatId,
                '📱 Поделитесь номером телефона, чтобы при записи через сайт ваши данные заполнялись автоматически.\n\nИли введите номер вручную в формате +7 999 000-00-00',
                {
                  keyboard: [[{ text: '📱 Поделиться номером', request_contact: true }]],
                  resize_keyboard: true,
                  one_time_keyboard: true,
                }
              );
            }
          }
        }
      }

      // Пользователь поделился контактом через кнопку
      if (message.contact && telegramId) {
        const rawPhone = message.contact.phone_number ?? '';
        const phone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
        await supabaseAdmin.from('profiles')
          .update({ phone })
          .eq('telegram_id', String(telegramId));
        await sendTelegramMessage(chatId,
          '✅ Телефон сохранён! Теперь при записи через сайт ваши данные будут заполнены автоматически.',
          { remove_keyboard: true }
        );
      }

      // Пользователь ввёл телефон вручную
      if (text && telegramId && !text.startsWith('/')) {
        const digits = text.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 12) {
          const phone = digits.length === 11 && digits.startsWith('8')
            ? `+7${digits.slice(1)}`
            : digits.startsWith('7') ? `+${digits}` : `+7${digits}`;
          await supabaseAdmin.from('profiles')
            .update({ phone })
            .eq('telegram_id', String(telegramId));
          await sendTelegramMessage(chatId,
            '✅ Телефон сохранён! Теперь при записи через сайт ваши данные будут заполнены автоматически.',
            { remove_keyboard: true }
          );
        }
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
