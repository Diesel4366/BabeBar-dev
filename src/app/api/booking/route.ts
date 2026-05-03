import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyUserToken } from '@/lib/userAuth';
import { Service } from '@/types';

export async function POST(req: Request) {
  try {
    const { name, phone, date, time, services, totalPrice }: {
      name: string; phone: string; date: string; time: string;
      services: Service[]; totalPrice: number;
    } = await req.json();

    if (!name || !phone || !date || !time || !services || services.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const formattedDate = date.split('T')[0];
    
    // Вычисляем end_time новой записи
    const totalDuration = services.reduce((sum: number, s: Service) => sum + s.duration_minutes, 0);
    const [h, m] = time.split(':').map(Number);
    const newStartMins = h * 60 + m;
    const newEndMins = newStartMins + totalDuration;

    // 0. Проверка на пересечение интервалов
    const { data: existingApps } = await supabaseAdmin
      .from('appointments')
      .select('start_time, end_time')
      .eq('date', formattedDate)
      .eq('status', 'active');

    if (existingApps) {
      for (const app of existingApps) {
        const [sh, sm] = app.start_time.split(':').map(Number);
        const [eh, em] = app.end_time.split(':').map(Number);
        const extStartMins = sh * 60 + sm;
        const extEndMins = eh * 60 + em;

        if (newStartMins < extEndMins && newEndMins > extStartMins) {
          return NextResponse.json({ error: 'Это время перекрывается другой записью' }, { status: 400 });
        }
      }
    }

    // 1. Находим профиль: сначала через сессию, потом по телефону
    let profileId: string | null = null;

    const store = await cookies();
    const sessionToken = store.get('user_session')?.value;
    if (sessionToken) {
      const sessionProfileId = await verifyUserToken(sessionToken, process.env.ADMIN_SECRET!);
      if (sessionProfileId) {
        profileId = sessionProfileId;
        await supabaseAdmin.from('profiles').update({ name, phone }).eq('id', profileId);
      }
    }

    if (!profileId) {
      let { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (!profile) {
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([{ id: crypto.randomUUID(), name, phone }])
          .select()
          .single();
        if (profileError || !newProfile) throw profileError || new Error('Failed to create profile');
        profile = newProfile;
      }
      profileId = profile!.id;
    }

    if (!profileId) throw new Error('Profile not found');

    // 2. Создаем запись
    const startTime = time;
    // Вычисляем end_time (упрощенно: начало + сумма длительностей)
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + totalDuration);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    const { data: appointment, error: appError } = await supabaseAdmin
      .from('appointments')
      .insert([{
        client_id: profileId,
        date: date.split('T')[0], // YYYY-MM-DD
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        status: 'active'
      }])
      .select()
      .single();

    if (appError || !appointment) throw appError || new Error('Failed to create appointment');

    // 3. Привязываем услуги
    const appointmentServices = services.map((s: Service) => ({
      appointment_id: appointment.id,
      service_id: s.id
    }));

    const { error: servicesError } = await supabaseAdmin
      .from('appointment_services')
      .insert(appointmentServices);

    if (servicesError) throw servicesError;

    // 3.5 Получение предупреждений по складу
    const { getInventoryWarning } = await import('@/lib/inventory-alerts');
    const inventoryWarning = await getInventoryWarning(appointment.id);

    // 4. Отправляем уведомления в Telegram
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const rawChatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '';
    const chatIds = rawChatIds.split(',').map(s => s.trim()).filter(Boolean);

    if (telegramToken && chatIds.length > 0) {
      // Получаем данные профиля (включая username)
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('telegram_username')
        .eq('id', profileId)
        .single();

      const dateFormatted = new Date(formattedDate + 'T12:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', weekday: 'long',
      });
      
      let message = `🌟 *Новая запись!*\n\n👤 *Клиент:* ${name}\n📞 *Телефон:* ${phone}`;
      
      if (profileData?.telegram_username) {
        message += `\n✈️ *Telegram:* @${profileData.telegram_username}`;
      }
      
      message += `\n📅 *Дата:* ${dateFormatted}\n⏰ *Время:* ${time} — ${endTime}\n💅 *Услуги:* ${services.map((s: Service) => s.name).join(', ')}\n💰 *Сумма:* ${totalPrice} ₽`;
      
      // Добавляем предупреждение по складу, если оно есть
      if (inventoryWarning) {
        message += inventoryWarning;
      }

      await Promise.allSettled(chatIds.map(chatId =>
        fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
        })
      ));
    }

    return NextResponse.json({ success: true, appointmentId: appointment.id });
  } catch (error: unknown) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Не удалось создать запись. Попробуйте ещё раз.' }, { status: 500 });
  }
}
