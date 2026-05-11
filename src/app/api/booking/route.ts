import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyUserToken } from '@/lib/userAuth';
import { normalizePhone } from '@/lib/phone';
import { initPayment, TinkoffReceipt } from '@/lib/tinkoff';
import { Service } from '@/types';

export async function POST(req: Request) {
  try {
    const { name, phone: rawPhone, date, time, services, totalPrice, promoCodeId, discountAmount = 0, paymentMethod = 'cash', paymentAmount = 0 }: {
      name: string; phone: string; date: string; time: string;
      services: Service[]; totalPrice: number;
      promoCodeId?: string; discountAmount?: number;
      paymentMethod?: 'cash' | 'online_50' | 'online_100';
      paymentAmount?: number;
    } = await req.json();

    const phone = rawPhone ? normalizePhone(rawPhone) : rawPhone;

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
      .in('status', ['active', 'pending_payment']);

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

    // Валидируем промокод повторно на сервере
    let validatedPromoId: string | null = null;
    if (promoCodeId) {
      const { data: promo } = await supabaseAdmin
        .from('promo_codes')
        .select('id, is_active, max_uses, used_count, expires_at')
        .eq('id', promoCodeId)
        .maybeSingle();
      const isValid = promo &&
        promo.is_active &&
        (!promo.expires_at || new Date(promo.expires_at) >= new Date()) &&
        (promo.max_uses === null || promo.used_count < promo.max_uses);
      if (isValid) validatedPromoId = promo.id;
    }

    const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://babebar.ru').replace(/\/$/, '');
    const usesPayment = paymentMethod !== 'cash' && !!process.env.TINKOFF_TERMINAL_KEY && paymentAmount > 0;

    const { data: appointment, error: appError } = await supabaseAdmin
      .from('appointments')
      .insert([{
        client_id: profileId,
        date: date.split('T')[0],
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        discount_amount: validatedPromoId ? discountAmount : 0,
        promo_code_id: validatedPromoId,
        prepaid_amount: usesPayment ? paymentAmount : 0,
        status: usesPayment ? 'pending_payment' : 'active',
        payment_status: usesPayment ? 'pending' : 'not_required',
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

    // Инкрементируем счётчик промокода
    if (validatedPromoId) {
      const { data: pc } = await supabaseAdmin
        .from('promo_codes').select('used_count').eq('id', validatedPromoId).single();
      if (pc) {
        await supabaseAdmin
          .from('promo_codes')
          .update({ used_count: pc.used_count + 1 })
          .eq('id', validatedPromoId);
      }
    }

    // Если есть эквайринг — инициируем оплату и возвращаем URL
    if (usesPayment) {
      const serviceNames = services.map((s: Service) => s.name).join(', ');
      const taxation = process.env.TINKOFF_TAXATION ?? 'usn_income';
      const isAdvance = paymentMethod === 'online_50';

      // Чек для онлайн-кассы (54-ФЗ)
      const receiptItems = isAdvance
        ? [{
            Name: `Предоплата: ${serviceNames}`.slice(0, 128),
            Price: Math.round(paymentAmount * 100),
            Quantity: 1,
            Amount: Math.round(paymentAmount * 100),
            PaymentMethod: 'full_payment' as const,
            PaymentObject: 'service' as const,
            Tax: 'none' as const,
          }]
        : services.map((s: Service) => {
            const itemPrice = Math.round(s.price * 100);
            return {
              Name: s.name.slice(0, 128),
              Price: itemPrice,
              Quantity: 1,
              Amount: itemPrice,
              PaymentMethod: 'full_payment' as const,
              PaymentObject: 'service' as const,
              Tax: 'none' as const,
            };
          });

      const receipt: TinkoffReceipt = {
        Phone: phone,
        Taxation: taxation,
        Items: receiptItems,
      };

      const payment = await initPayment({
        orderId: appointment.id,
        amount: paymentAmount,
        description: `BABEBAR: ${serviceNames}`,
        successUrl: `${siteOrigin}/booking/success?id=${appointment.id}`,
        failUrl: `${siteOrigin}/booking/fail?id=${appointment.id}`,
        notificationUrl: `${siteOrigin}/api/payment/tinkoff/webhook`,
        receipt,
      });

      if (!payment) {
        // Не удалось инициировать платёж — откатываем запись
        await supabaseAdmin.from('appointments').delete().eq('id', appointment.id);
        return NextResponse.json({ error: 'Не удалось инициировать оплату. Попробуйте ещё раз.' }, { status: 500 });
      }

      await supabaseAdmin
        .from('appointments')
        .update({ payment_id: payment.paymentId })
        .eq('id', appointment.id);

      return NextResponse.json({ paymentUrl: payment.paymentUrl, appointmentId: appointment.id });
    }

    // 3.5 Получение предупреждений по складу
    const { getInventoryWarning } = await import('@/lib/inventory-alerts');
    const inventoryWarning = await getInventoryWarning(appointment.id);

    // 4. Отправляем уведомления в Telegram (только если оплата не используется)
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const rawChatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '';
    const chatIds = rawChatIds.split(',').map(s => s.trim()).filter(Boolean);

    if (telegramToken) {
      // Получаем данные профиля
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('telegram_username, telegram_chat_id, telegram_id')
        .eq('id', profileId)
        .single();

      const dateFormatted = new Date(formattedDate + 'T12:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', weekday: 'long',
      });

      const serviceNames = services.map((s: Service) => s.name).join(', ');

      // 4а. Уведомление администраторам
      const rawChatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '';
      const chatIds = rawChatIds.split(',').map(s => s.trim()).filter(Boolean);

      if (chatIds.length > 0) {
        let adminMessage = `🌟 *Новая запись!*\n\n👤 *Клиент:* ${name}\n📞 *Телефон:* ${phone}`;
        if (profileData?.telegram_username) {
          adminMessage += `\n✈️ *Telegram:* @${profileData.telegram_username}`;
        }
        adminMessage += `\n📅 *Дата:* ${dateFormatted}\n⏰ *Время:* ${time} — ${endTime}\n💅 *Услуги:* ${serviceNames}\n💰 *Сумма:* ${totalPrice} ₽`;
        if (validatedPromoId && discountAmount > 0) adminMessage += ` _(скидка ${discountAmount} ₽)_`;
        if (inventoryWarning) {
          adminMessage += inventoryWarning;
        }

        await Promise.allSettled(chatIds.map(chatId =>
          fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: adminMessage, parse_mode: 'Markdown' }),
          })
        ));
      }

      // 4б. Уведомление клиенту
      const clientChatId = profileData?.telegram_chat_id || profileData?.telegram_id;
      if (clientChatId) {
        const { getSettings } = await import('@/lib/settings');
        const siteSettings = await getSettings();
        let clientMessage = `✅ *Запись подтверждена!*\n\n📅 *Дата:* ${dateFormatted}\n⏰ *Время:* ${time} — ${endTime}\n💅 *Услуги:* ${serviceNames}\n💰 *Сумма:* ${totalPrice} ₽`;
        if (siteSettings.address) {
          clientMessage += `\n\n📍 *Адрес:* ${siteSettings.address}`;
        }
        clientMessage += `\n\nБудем рады вас видеть! 🌸`;

        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: clientChatId, text: clientMessage, parse_mode: 'Markdown' }),
        });
      }
    }

    return NextResponse.json({ success: true, appointmentId: appointment.id });
  } catch (error: unknown) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Не удалось создать запись. Попробуйте ещё раз.' }, { status: 500 });
  }
}
