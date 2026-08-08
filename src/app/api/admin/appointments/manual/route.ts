import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';
import { verifyAdminToken } from '@/lib/auth';
async function checkAuth(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  const cookie = req.headers.get('cookie') || '';
  const session = cookie.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];
  return !(!session || !secret || !(await verifyAdminToken(session, secret)));
}

export async function POST(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const {
      profileId,
      name,
      phone: rawPhone,
      telegramUsername,
      services,
      date,
      time,
      source,
    }: {
      profileId?: string;
      name?: string;
      phone?: string;
      telegramUsername?: string;
      services: { id: string; duration_minutes: number; price: number; name: string }[];
      date: string;
      time: string;
      source?: string;
    } = await req.json();

    if (!services?.length || !date || !time) {
      return NextResponse.json({ error: 'Услуги, дата и время обязательны' }, { status: 400 });
    }

    const totalDuration = services.reduce((s, v) => s + v.duration_minutes, 0);
    const totalPrice = services.reduce((s, v) => s + v.price, 0);

    // Вычисляем end_time
    const [h, m] = time.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(h, m + totalDuration);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    // Проверка пересечений
    const newStart = h * 60 + m;
    const newEnd = newStart + totalDuration;
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('start_time, end_time')
      .eq('date', date)
      .in('status', ['active', 'pending_payment']);

    for (const app of existing ?? []) {
      const [sh, sm] = app.start_time.split(':').map(Number);
      const [eh, em] = app.end_time.split(':').map(Number);
      if (newStart < eh * 60 + em && newEnd > sh * 60 + sm) {
        return NextResponse.json({ error: 'Это время перекрывается с другой записью' }, { status: 400 });
      }
    }

    // Находим или создаём профиль
    let finalProfileId = profileId ?? null;
    if (!finalProfileId) {
      if (!name || !rawPhone) {
        return NextResponse.json({ error: 'Для нового клиента нужны имя и телефон' }, { status: 400 });
      }
      const phone = normalizePhone(rawPhone);
      const { data: found } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (found) {
        finalProfileId = found.id;
        // Обновляем имя и telegram если есть
        await supabaseAdmin.from('profiles').update({
          name,
          ...(telegramUsername ? { telegram_username: telegramUsername } : {}),
        }).eq('id', finalProfileId);
      } else {
        const { data: created, error: ce } = await supabaseAdmin
          .from('profiles')
          .insert([{
            id: crypto.randomUUID(),
            name,
            phone,
            ...(telegramUsername ? { telegram_username: telegramUsername } : {}),
          }])
          .select()
          .single();
        if (ce || !created) throw ce ?? new Error('Failed to create profile');
        finalProfileId = created.id;
      }
    }

    // Создаём запись
    const { data: appointment, error: ae } = await supabaseAdmin
      .from('appointments')
      .insert([{
        client_id: finalProfileId,
        date,
        start_time: time,
        end_time: endTime,
        total_price: totalPrice,
        status: 'active',
        source: source ?? null,
      }])
      .select()
      .single();

    if (ae || !appointment) throw ae ?? new Error('Failed to create appointment');

    // Привязываем услуги
    await supabaseAdmin.from('appointment_services').insert(
      services.map(s => ({ appointment_id: appointment.id, service_id: s.id }))
    );

    // Уведомление администраторам
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const chatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (telegramToken && chatIds.length) {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('name, phone, telegram_username').eq('id', finalProfileId).single();
      const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
      const serviceNames = services.map(s => s.name).join(', ');
      const sourceLabels: Record<string, string> = {
        word_of_mouth: 'Сарафанное радио', telegram: 'Telegram', vk: 'ВКонтакте',
        phone_call: 'Звонок', avito: 'Авито', other: 'Другое',
      };
      let msg = `📋 *Запись от администратора*\n\n👤 *Клиент:* ${profile?.name ?? name}\n📞 *Телефон:* ${profile?.phone ?? rawPhone}`;
      if (profile?.telegram_username) msg += `\n✈️ *Telegram:* @${profile.telegram_username}`;
      msg += `\n📅 *Дата:* ${dateFormatted}\n⏰ *Время:* ${time} — ${endTime}\n💅 *Услуги:* ${serviceNames}\n💰 *Сумма:* ${totalPrice} ₽`;
      if (source) msg += `\n📣 *Источник:* ${sourceLabels[source] ?? source}`;
      await Promise.allSettled(chatIds.map(chatId =>
        fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
        })
      ));
    }

    return NextResponse.json({ success: true, appointmentId: appointment.id });
  } catch (err: any) {
    console.error('Manual booking error:', err);
    return NextResponse.json({ error: err.message ?? 'Ошибка создания записи' }, { status: 500 });
  }
}
