import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { format, startOfToday, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

const TOKEN = process.env.TELEGRAM_TOKEN;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function tg(method: string, body: object) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sendMsg(chatId: number, text: string, replyMarkup?: object) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', reply_markup: replyMarkup });
}

async function editMsg(chatId: number, messageId: number, text: string, replyMarkup?: object) {
  return tg('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', reply_markup: replyMarkup });
}

const MAIN_MENU = {
  inline_keyboard: [
    [{ text: '💅 Записаться', callback_data: 'view_services' }],
    [{ text: '📅 Мои записи', callback_data: 'my_appointments' }],
  ],
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length >= 11 && digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

// Найти профиль по telegram_id. Если не нашли — попробовать найти по нормализованному телефону
// и прилинковать telegram_id к нему (merge split profiles).
async function linkOrMergeProfile(telegramId: number, phone: string, name: string | null, username: string | null) {
  const tidStr = String(telegramId);
  const normalPhone = normalizePhone(phone);

  // 1. Ищем профиль по telegram_id
  const { data: tgProfile } = await supabaseAdmin
    .from('profiles').select('id').eq('telegram_id', tidStr).maybeSingle();

  // 2. Ищем все профили с непустым телефоном (кроме уже найденного по tg)
  const { data: allPhoneProfiles } = await supabaseAdmin
    .from('profiles').select('id, phone').not('phone', 'is', null);

  // Ищем совпадение по нормализованному телефону
  const phoneMatch = allPhoneProfiles?.find(p =>
    p.id !== tgProfile?.id && normalizePhone(p.phone as string) === normalPhone
  );

  if (phoneMatch) {
    // Профиль с этим телефоном уже есть → прилинковываем telegram_id к нему
    await supabaseAdmin.from('profiles').update({
      telegram_id: tidStr,
      telegram_username: username,
      name: name ?? undefined,
    }).eq('id', phoneMatch.id);

    // Если у telegram-профиля нет записей — удаляем его как дубль
    if (tgProfile && tgProfile.id !== phoneMatch.id) {
      const { count } = await supabaseAdmin
        .from('appointments').select('id', { count: 'exact', head: true }).eq('client_id', tgProfile.id);
      if ((count ?? 0) === 0) {
        await supabaseAdmin.from('profiles').delete().eq('id', tgProfile.id);
      }
    }
    return phoneMatch.id;
  }

  // Телефонного дубля нет → просто обновляем телефон на текущем tg-профиле
  if (tgProfile) {
    await supabaseAdmin.from('profiles').update({ phone: normalPhone }).eq('id', tgProfile.id);
    return tgProfile.id;
  }

  return null;
}

function toMins(t: string) {
  const [h, m] = t.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function fromMins(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function generateSlots(
  startTime: string,
  endTime: string,
  duration: number,
  existing: { start_time: string; end_time: string }[]
): string[] {
  const start = toMins(startTime);
  const end = toMins(endTime);
  const slots: string[] = [];
  for (let t = start; t + duration <= end; t += 30) {
    const tEnd = t + duration;
    const blocked = existing.some(a => {
      const as = toMins(a.start_time);
      const ae = toMins(a.end_time);
      return t < ae && tEnd > as;
    });
    if (!blocked) slots.push(fromMins(t));
  }
  return slots;
}

async function notifyAdmins(text: string) {
  const chatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!chatIds.length) return;
  await Promise.allSettled(chatIds.map(cid =>
    tg('sendMessage', { chat_id: cid, text, parse_mode: 'Markdown' })
  ));
}

async function fetchAndStoreAvatar(telegramId: number, profileId: string): Promise<string | null> {
  if (!TOKEN) return null;
  try {
    const r1 = await fetch(`https://api.telegram.org/bot${TOKEN}/getUserProfilePhotos?user_id=${telegramId}&limit=1`);
    const d1 = await r1.json();
    if (!d1.ok || !d1.result?.photos?.[0]?.length) return null;
    const sizes = d1.result.photos[0];
    const fileId = sizes[sizes.length - 1].file_id;
    const r2 = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
    const d2 = await r2.json();
    if (!d2.ok || !d2.result?.file_path) return null;
    const photoRes = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${d2.result.file_path}`);
    if (!photoRes.ok) return null;
    const buffer = await photoRes.arrayBuffer();
    const { error } = await supabaseAdmin.storage
      .from('avatars').upload(`${profileId}.jpg`, buffer, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = supabaseAdmin.storage.from('avatars').getPublicUrl(`${profileId}.jpg`);
    return publicUrl;
  } catch {
    return null;
  }
}

// ─── My appointments ─────────────────────────────────────────────────────────

async function handleMyAppointments(chatId: number, telegramId: number | undefined, messageId?: number) {
  const reply = (text: string, markup?: object) =>
    messageId ? editMsg(chatId, messageId, text, markup) : sendMsg(chatId, text, markup);

  if (!telegramId) {
    await reply('Не удалось определить аккаунт.', MAIN_MENU);
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id').eq('telegram_id', String(telegramId)).maybeSingle();

  if (!profile) {
    await reply('Профиль не найден. Войдите на сайте [babebar.ru](https://babebar.ru).', MAIN_MENU);
    return;
  }

  const { data: appts } = await supabaseAdmin
    .from('appointments')
    .select('date, start_time, end_time, total_price, appointment_services(services(name))')
    .eq('client_id', profile.id)
    .eq('status', 'active')
    .gte('date', format(startOfToday(), 'yyyy-MM-dd'))
    .order('date', { ascending: true })
    .limit(5);

  if (!appts?.length) {
    await reply('📅 Предстоящих записей нет.', MAIN_MENU);
    return;
  }

  const lines = appts.map(a => {
    const dateStr = format(new Date(a.date + 'T12:00:00'), 'eeee, d MMMM', { locale: ru });
    const svcNames = (a.appointment_services as unknown as { services: { name: string } | null }[])
      .map(s => s.services?.name).filter(Boolean).join(', ');
    return `📅 *${dateStr}*\n⏰ ${a.start_time.substring(0, 5)} — ${a.end_time.substring(0, 5)}\n💅 ${svcNames}\n💰 ${a.total_price} ₽`;
  }).join('\n\n');

  await reply(`*Ваши предстоящие записи:*\n\n${lines}`, MAIN_MENU);
}

// ─── Webhook handler ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'Token not set' }, { status: 500 });

  try {
    const body = await req.json();
    const { message, callback_query } = body;

    // ── Text messages ─────────────────────────────────────────────────────────
    if (message) {
      const chatId: number = message.chat.id;
      const text: string | undefined = message.text;
      const telegramId: number | undefined = message.from?.id;

      if (text === '/start' || text === '/menu') {
        await sendMsg(chatId, 'Добро пожаловать в *BABEBAR!* 🌟\n\nЗдесь вы можете записаться на услуги или посмотреть свои записи.', MAIN_MENU);

        if (telegramId) {
          const { data: profile } = await supabaseAdmin
            .from('profiles').select('id, telegram_photo, phone').eq('telegram_id', String(telegramId)).maybeSingle();

          let profileId = profile?.id;

          if (!profileId) {
            // Создаём профиль из данных Telegram если его ещё нет
            const { data: created } = await supabaseAdmin
              .from('profiles')
              .insert({
                id: crypto.randomUUID(),
                telegram_id: String(telegramId),
                name: message.from?.first_name ?? null,
                telegram_username: message.from?.username ?? null,
              })
              .select('id').single();
            profileId = created?.id ?? null;
          } else {
            // Обновляем имя и username на случай если изменились
            await supabaseAdmin.from('profiles').update({
              name: message.from?.first_name ?? null,
              telegram_username: message.from?.username ?? null,
            }).eq('id', profileId);
          }

          if (profileId) {
            if (!profile?.telegram_photo) {
              const url = await fetchAndStoreAvatar(telegramId, profileId);
              if (url) await supabaseAdmin.from('profiles').update({ telegram_photo: url }).eq('id', profileId);
            }
            if (!profile?.phone) {
              await sendMsg(chatId,
                '📱 Поделитесь номером телефона — тогда при записи через сайт данные заполнятся автоматически.',
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

      if (text === '/my') {
        await handleMyAppointments(chatId, telegramId);
      }

      if (message.contact && telegramId) {
        const phone = message.contact.phone_number ?? '';
        await linkOrMergeProfile(telegramId, phone, message.from?.first_name ?? null, message.from?.username ?? null);
        await sendMsg(chatId, '✅ Телефон сохранён! Записи с сайта теперь привязаны к вашему аккаунту.', { remove_keyboard: true });
      }

      if (text && telegramId && !text.startsWith('/')) {
        const digits = text.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 12) {
          await linkOrMergeProfile(telegramId, text, message.from?.first_name ?? null, message.from?.username ?? null);
          await sendMsg(chatId, '✅ Телефон сохранён! Записи с сайта теперь привязаны к вашему аккаунту.', { remove_keyboard: true });
        }
      }
    }

    // ── Callbacks ─────────────────────────────────────────────────────────────
    if (callback_query) {
      const chatId: number = callback_query.message.chat.id;
      const data: string = callback_query.data;
      const messageId: number = callback_query.message.message_id;
      const telegramId: number | undefined = callback_query.from?.id;

      await tg('answerCallbackQuery', { callback_query_id: callback_query.id });

      // Главное меню
      if (data === 'start_over') {
        await editMsg(chatId, messageId, 'Главное меню *BABEBAR* 🌟', MAIN_MENU);
      }

      // Список услуг
      if (data === 'view_services') {
        const { data: services } = await supabaseAdmin
          .from('services').select('id, name, price')
          .eq('is_active', true).eq('is_addon', false).order('name');

        if (!services?.length) {
          await editMsg(chatId, messageId, 'Услуги временно недоступны.', MAIN_MENU);
          return NextResponse.json({ ok: true });
        }

        const buttons = [
          ...services.map(s => ([{ text: `${s.name} — ${s.price} ₽`, callback_data: `select_date:${s.id}` }])),
          [{ text: '◀️ Назад', callback_data: 'start_over' }],
        ];
        await editMsg(chatId, messageId, 'Выберите услугу:', { inline_keyboard: buttons });
      }

      // Выбор даты (только рабочие дни из расписания)
      if (data.startsWith('select_date:')) {
        const serviceId = data.split(':')[1];
        const todayStr = format(startOfToday(), 'yyyy-MM-dd');
        const untilStr = format(addDays(startOfToday(), 60), 'yyyy-MM-dd');

        const { data: workingDays } = await supabaseAdmin
          .from('schedule_exceptions')
          .select('date')
          .eq('is_working', true)
          .gte('date', todayStr)
          .lte('date', untilStr)
          .order('date', { ascending: true })
          .limit(7);

        if (!workingDays?.length) {
          await editMsg(chatId, messageId, 'Ближайших свободных дней нет. Попробуйте позже.', {
            inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'view_services' }]],
          });
          return NextResponse.json({ ok: true });
        }

        const buttons = [
          ...workingDays.map(d => [{
            text: format(new Date(d.date + 'T12:00:00'), 'eeee, d MMMM', { locale: ru }),
            callback_data: `select_time:${serviceId}:${d.date}`,
          }]),
          [{ text: '◀️ Назад', callback_data: 'view_services' }],
        ];
        await editMsg(chatId, messageId, 'Выберите дату:', { inline_keyboard: buttons });
      }

      // Выбор времени (реальные слоты из расписания)
      if (data.startsWith('select_time:')) {
        const [, serviceId, dateStr] = data.split(':');

        const [{ data: service }, { data: schedule }, { data: existingAppts }] = await Promise.all([
          supabaseAdmin.from('services').select('duration_minutes').eq('id', serviceId).single(),
          supabaseAdmin.from('schedule_exceptions').select('start_time, end_time').eq('date', dateStr).eq('is_working', true).maybeSingle(),
          supabaseAdmin.from('appointments').select('start_time, end_time').eq('date', dateStr).eq('status', 'active'),
        ]);

        if (!service) {
          await editMsg(chatId, messageId, 'Услуга не найдена.', { inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'view_services' }]] });
          return NextResponse.json({ ok: true });
        }

        const slots = generateSlots(
          schedule?.start_time ?? '10:00:00',
          schedule?.end_time ?? '21:00:00',
          service.duration_minutes,
          existingAppts ?? []
        );

        if (!slots.length) {
          await editMsg(chatId, messageId, 'На этот день свободных слотов нет. Выберите другой день.', {
            inline_keyboard: [[{ text: '◀️ Изменить дату', callback_data: `select_date:${serviceId}` }]],
          });
          return NextResponse.json({ ok: true });
        }

        const dateDisplay = format(new Date(dateStr + 'T12:00:00'), 'd MMMM', { locale: ru });
        // Время в callback_data кодируем без двоеточия: 14:30 → 14_30
        const timeButtons: { text: string; callback_data: string }[][] = [];
        for (let i = 0; i < slots.length; i += 3) {
          timeButtons.push(slots.slice(i, i + 3).map(t => ({
            text: t,
            callback_data: `confirm:${serviceId}:${dateStr}:${t.replace(':', '_')}`,
          })));
        }
        timeButtons.push([{ text: '◀️ Изменить дату', callback_data: `select_date:${serviceId}` }]);
        await editMsg(chatId, messageId, `*${dateDisplay}* — выберите время:`, { inline_keyboard: timeButtons });
      }

      // Подтверждение и создание записи
      if (data.startsWith('confirm:')) {
        const parts = data.split(':');
        const serviceId = parts[1];
        const dateStr = parts[2];
        const time = parts[3].replace('_', ':'); // decode: 14_30 → 14:30

        const [{ data: service }, { data: profile }] = await Promise.all([
          supabaseAdmin.from('services').select('name, price, duration_minutes').eq('id', serviceId).single(),
          supabaseAdmin.from('profiles').select('id, name, phone').eq('telegram_id', String(telegramId)).maybeSingle(),
        ]);

        if (!service) {
          await editMsg(chatId, messageId, 'Услуга не найдена.', { inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'start_over' }]] });
          return NextResponse.json({ ok: true });
        }

        if (!profile) {
          await editMsg(chatId, messageId,
            '❌ Профиль не найден.\n\nВойдите на [babebar.ru](https://babebar.ru) через Telegram и попробуйте снова.',
            { inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'start_over' }]] }
          );
          return NextResponse.json({ ok: true });
        }

        const startMins = toMins(time);
        const endTime = fromMins(startMins + service.duration_minutes);

        // Проверка конфликтов
        const { data: existing } = await supabaseAdmin
          .from('appointments').select('start_time, end_time').eq('date', dateStr).eq('status', 'active');

        const conflict = (existing ?? []).some(a => {
          const as = toMins(a.start_time), ae = toMins(a.end_time);
          return startMins < ae && (startMins + service.duration_minutes) > as;
        });

        if (conflict) {
          await editMsg(chatId, messageId, '❌ Это время уже занято. Выберите другое.', {
            inline_keyboard: [[{ text: '◀️ Изменить время', callback_data: `select_time:${serviceId}:${dateStr}` }]],
          });
          return NextResponse.json({ ok: true });
        }

        // Создаём запись
        const { data: appointment, error } = await supabaseAdmin
          .from('appointments')
          .insert([{ client_id: profile.id, date: dateStr, start_time: time, end_time: endTime, total_price: service.price, status: 'active' }])
          .select().single();

        if (error || !appointment) {
          await editMsg(chatId, messageId, '❌ Не удалось создать запись. Попробуйте ещё раз.', {
            inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'start_over' }]],
          });
          return NextResponse.json({ ok: true });
        }

        await supabaseAdmin.from('appointment_services').insert([{ appointment_id: appointment.id, service_id: serviceId }]);

        const dateDisplay = format(new Date(dateStr + 'T12:00:00'), 'eeee, d MMMM', { locale: ru });
        await editMsg(chatId, messageId,
          `✅ *Запись подтверждена!*\n\n💅 ${service.name}\n📅 ${dateDisplay}\n⏰ ${time} — ${endTime}\n💰 ${service.price} ₽\n\nДо встречи! 🌟`,
          { inline_keyboard: [[{ text: '📅 Мои записи', callback_data: 'my_appointments' }], [{ text: '🏠 Главное меню', callback_data: 'start_over' }]] }
        );

        // Уведомление мастерам
        await notifyAdmins(
          `🌟 *Новая запись (бот)!*\n\n👤 *Клиент:* ${profile.name ?? 'Без имени'}\n📞 *Телефон:* ${profile.phone ?? '—'}\n📅 *Дата:* ${dateDisplay}\n⏰ *Время:* ${time} — ${endTime}\n💅 *Услуга:* ${service.name}\n💰 *Сумма:* ${service.price} ₽`
        );
      }

      // Мои записи
      if (data === 'my_appointments') {
        await handleMyAppointments(chatId, telegramId, messageId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
