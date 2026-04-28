import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { name, phone, date, time, services, totalPrice } = await req.json();

    if (!name || !phone || !date || !time || !services || services.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Находим или создаем профиль
    // Так как у нас нет Auth в этом шаге, мы просто ищем по телефону
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();

    if (!profile) {
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{ 
          id: crypto.randomUUID(), // В реальном приложении лучше использовать Auth
          name, 
          phone 
        }])
        .select()
        .single();

      if (profileError) throw profileError;
      profile = newProfile;
    }

    // 2. Создаем запись
    const startTime = time;
    // Вычисляем end_time (упрощенно: начало + сумма длительностей)
    const totalDuration = services.reduce((sum: number, s: any) => sum + s.duration_minutes, 0);
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + totalDuration);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    const { data: appointment, error: appError } = await supabaseAdmin
      .from('appointments')
      .insert([{
        client_id: profile.id,
        date: date.split('T')[0], // YYYY-MM-DD
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        status: 'active'
      }])
      .select()
      .single();

    if (appError) throw appError;

    // 3. Привязываем услуги
    const appointmentServices = services.map((s: any) => ({
      appointment_id: appointment.id,
      service_id: s.id
    }));

    const { error: servicesError } = await supabaseAdmin
      .from('appointment_services')
      .insert(appointmentServices);

    if (servicesError) throw servicesError;

    // 4. Отправляем уведомление в Telegram (опционально, если настроен бот)
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (telegramToken && adminChatId) {
      const message = `
🌟 *Новая запись на сайте!*

👤 *Клиент:* ${name}
📞 *Телефон:* ${phone}
📅 *Дата:* ${new Date(date).toLocaleDateString('ru-RU')}
⏰ *Время:* ${time}
💅 *Услуги:* ${services.map((s: any) => s.name).join(', ')}
💰 *Сумма:* ${totalPrice} ₽
      `;

      try {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: message,
            parse_mode: 'Markdown'
          })
        });
      } catch (tgError) {
        console.error('Telegram notification error:', tgError);
      }
    }

    return NextResponse.json({ success: true, appointmentId: appointment.id });
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
