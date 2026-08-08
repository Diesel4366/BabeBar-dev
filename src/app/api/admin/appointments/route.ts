import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminToken } from '@/lib/auth';
async function checkAuth(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  const cookie = req.headers.get('cookie') || '';
  const session = cookie.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];
  return !(!session || !secret || !(await verifyAdminToken(session, secret)));
}

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);

    // Плоский список без пагинации — для страницы /admin/calendar
    const calMonth = searchParams.get('month');
    const calDate  = searchParams.get('date');
    if (calMonth || calDate) {
      let q = supabaseAdmin
        .from('appointments')
        .select('*, client:profiles(name, phone, telegram_username), services:appointment_services(service:services(id, name, price, duration_minutes))')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (calMonth) {
        const [cy, cm] = calMonth.split('-').map(Number);
        const cFrom = calMonth + '-01';
        const cLastDay = new Date(cy, cm, 0).getDate();
        const cTo = calMonth + '-' + String(cLastDay).padStart(2, '0');
        q = q.gte('date', cFrom).lte('date', cTo);
      } else {
        q = q.eq('date', calDate as string);
      }
      const { data: calData, error: calErr } = await q;
      if (calErr) throw calErr;
      return NextResponse.json((calData ?? []).map((app: any) => ({
        id: app.id, date: app.date,
        startTime: app.start_time, endTime: app.end_time,
        status: app.status, totalPrice: app.total_price,
        client: app.client,
        services: (app.services ?? []).map((s: any) => s.service),
      })));
    }

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const statusFilter = searchParams.get('status') ?? 'all';
    const dateFilter = searchParams.get('dateFilter') ?? 'all';
    const search = searchParams.get('search')?.trim() ?? '';

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const ACTIVE = ['active', 'pending_payment'];
    const INACTIVE = ['completed', 'cancelled_by_admin', 'cancelled_by_client'];

    const dataSelect = `*,
        client:profiles${search ? '!inner' : ''}(name, phone, telegram_username),
        services:appointment_services(service:services(id, name, price, duration_minutes))`;

    const applyFilters = (q: any): any => {
      if (dateFilter === 'today') q = q.eq('date', today);
      if (dateFilter === 'week') q = q.gte('date', weekAgo);
      if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`, { foreignTable: 'profiles' });
      return q;
    };

    const fmt = (data: any[]) => data.map((app: any) => ({
      id: app.id,
      date: app.date,
      startTime: app.start_time,
      endTime: app.end_time,
      status: app.status,
      totalPrice: app.total_price,
      prepaidAmount: app.prepaid_amount ?? 0,
      paymentStatus: app.payment_status ?? 'not_required',
      source: app.source ?? null,
      client: app.client,
      services: (app.services ?? []).map((s: any) => s.service),
    }));

    // Конкретный статус — одиночный запрос
    if (statusFilter !== 'all') {
      const asc = ACTIVE.includes(statusFilter);
      const { data, count, error } = await applyFilters(
        supabaseAdmin.from('appointments')
          .select(dataSelect, { count: 'exact' })
          .eq('status', statusFilter)
          .order('date', { ascending: asc })
          .order('start_time', { ascending: asc })
          .range(from, to)
      );
      if (error) throw error;
      return NextResponse.json({ data: fmt(data ?? []), total: count ?? 0 });
    }

    // Все статусы: сначала активные (ASC по дате), потом завершённые/отменённые (DESC)
    const { count: activeTotal, error: cntErr } = await applyFilters(
      supabaseAdmin.from('appointments')
        .select('*', { count: 'exact', head: true })
        .in('status', ACTIVE)
    );
    if (cntErr) throw cntErr;
    const activeCnt = activeTotal ?? 0;

    let rows: any[] = [];
    let total = 0;

    if (from < activeCnt) {
      // Страница начинается в активных записях
      const { data: activeData, error: e1 } = await applyFilters(
        supabaseAdmin.from('appointments')
          .select(dataSelect)
          .in('status', ACTIVE)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .range(from, Math.min(to, activeCnt - 1))
      );
      if (e1) throw e1;
      rows = activeData ?? [];

      const need = PAGE_SIZE - rows.length;
      if (need > 0) {
        // Добираем неактивные записи для заполнения страницы
        const { data: inactiveData, count: inactiveCnt, error: e2 } = await applyFilters(
          supabaseAdmin.from('appointments')
            .select(dataSelect, { count: 'exact' })
            .in('status', INACTIVE)
            .order('date', { ascending: false })
            .order('start_time', { ascending: false })
            .range(0, need - 1)
        );
        if (e2) throw e2;
        rows = [...rows, ...(inactiveData ?? [])];
        total = activeCnt + (inactiveCnt ?? 0);
      } else {
        const { count: inactiveCnt, error: e2 } = await applyFilters(
          supabaseAdmin.from('appointments')
            .select('*', { count: 'exact', head: true })
            .in('status', INACTIVE)
        );
        if (e2) throw e2;
        total = activeCnt + (inactiveCnt ?? 0);
      }
    } else {
      // С страница целиком в неактивных записях
      const inactiveFrom = from - activeCnt;
      const inactiveTo = to - activeCnt;
      const { data: inactiveData, count: inactiveCnt, error: e1 } = await applyFilters(
        supabaseAdmin.from('appointments')
          .select(dataSelect, { count: 'exact' })
          .in('status', INACTIVE)
          .order('date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(inactiveFrom, inactiveTo)
      );
      if (e1) throw e1;
      rows = inactiveData ?? [];
      total = activeCnt + (inactiveCnt ?? 0);
    }

    return NextResponse.json({ data: fmt(rows), total });

  } catch (error: any) {
    console.error('Admin appointments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function toMins(t: string) {
  const [h, m] = t.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function fromMins(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`;
}

export async function DELETE(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await supabaseAdmin.from('appointment_services').delete().eq('appointment_id', id);
    const { error } = await supabaseAdmin.from('appointments').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { id, status, action } = body;
    const VALID_STATUSES = ['active', 'completed', 'cancelled_by_client', 'cancelled_by_admin', 'pending_payment'];
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // ── Перенос записи ────────────────────────────────────────────────────────
    if (action === 'reschedule') {
      const { date, startTime } = body as { date: string; startTime: string };

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('appointments')
        .select('*, profiles(name, telegram_id, telegram_chat_id), appointment_services(services(name))')
        .eq('id', id)
        .single();

      if (fetchError || !existing) return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });

      const duration = toMins(existing.end_time) - toMins(existing.start_time);
      const startMins = toMins(startTime);
      const endTime = fromMins(startMins + duration);

      // Проверка конфликтов (исключаем саму запись)
      const { data: conflicts } = await supabaseAdmin
        .from('appointments')
        .select('start_time, end_time')
        .eq('date', date)
        .in('status', ['active', 'pending_payment'])
        .neq('id', id);

      const hasConflict = (conflicts ?? []).some(a => {
        const as = toMins(a.start_time), ae = toMins(a.end_time);
        return startMins < ae && (startMins + duration) > as;
      });

      if (hasConflict) return NextResponse.json({ error: 'Это время уже занято' }, { status: 409 });

      const { error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({ date, start_time: startTime, end_time: endTime })
        .eq('id', id);

      if (updateError) throw updateError;

      // Уведомление клиенту в Telegram
      const telegramToken = process.env.TELEGRAM_TOKEN;
      const profile = existing.profiles as any;
      const clientChatId = profile?.telegram_chat_id || profile?.telegram_id;
      if (telegramToken && clientChatId) {
        const serviceNames = (existing.appointment_services as any[])
          ?.map((s: any) => s.services?.name).filter(Boolean).join(', ') || 'Услуга';
        const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', {
          day: 'numeric', month: 'long', weekday: 'long',
        });
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: clientChatId,
            text: `🔄 <b>Ваша запись перенесена</b>\n\n📅 <b>Новая дата:</b> ${dateFormatted}\n⏰ <b>Время:</b> ${startTime.substring(0, 5)} — ${endTime.substring(0, 5)}\n💅 <b>Услуги:</b> ${serviceNames}\n\nЕсли у вас вопросы — свяжитесь с нами 🌸`,
            parse_mode: 'HTML',
          }),
        });
      }

      return NextResponse.json({ success: true, endTime });
    }

    // ── Изменение услуг ───────────────────────────────────────────────────────
    if (action === 'update_services') {
      const serviceIds: string[] = body.serviceIds ?? [];
      if (!serviceIds.length) return NextResponse.json({ error: 'Выберите хотя бы одну услугу' }, { status: 400 });

      const { data: services, error: servErr } = await supabaseAdmin
        .from('services')
        .select('id, price, duration_minutes')
        .in('id', serviceIds);
      if (servErr) throw servErr;

      const { data: appt, error: apptErr } = await supabaseAdmin
        .from('appointments')
        .select('start_time')
        .eq('id', id)
        .single();
      if (apptErr || !appt) return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });

      const totalPrice = (services ?? []).reduce((s, sv) => s + sv.price, 0);
      const totalDuration = (services ?? []).reduce((s, sv) => s + sv.duration_minutes, 0);
      const newEndTime = fromMins(toMins(appt.start_time) + totalDuration);

      const { error: delErr } = await supabaseAdmin
        .from('appointment_services')
        .delete()
        .eq('appointment_id', id);
      if (delErr) throw delErr;

      const { error: insErr } = await supabaseAdmin
        .from('appointment_services')
        .insert(serviceIds.map(sid => ({ appointment_id: id, service_id: sid })));
      if (insErr) throw insErr;

      const { error: updErr } = await supabaseAdmin
        .from('appointments')
        .update({ total_price: totalPrice, end_time: newEndTime })
        .eq('id', id);
      if (updErr) throw updErr;

      return NextResponse.json({ success: true, totalPrice, endTime: newEndTime });
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ status: status as string })
      .eq('id', id)
      .select(`
        *,
        profiles (name, telegram_id, telegram_chat_id),
        appointment_services (services (name))
      `)
      .single();

    if (error) throw error;

    // Уведомления в Telegram
    const telegramToken = process.env.TELEGRAM_TOKEN;
    if (telegramToken && data) {
      const profile = data.profiles as any;
      const chatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
      const serviceNames = (data.appointment_services as any[])
        ?.map((s: any) => s.services?.name).filter(Boolean).join(', ') || 'Услуга';
      const dateFormatted = new Date(data.date + 'T12:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', weekday: 'long',
      });
      const esc = (s?: string | null) =>
        (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const clientChatId = profile?.telegram_chat_id || profile?.telegram_id;

      if (status === 'cancelled_by_admin') {
        // Клиенту — запись отменена администратором
        if (clientChatId) {
          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: clientChatId,
              text: `❌ <b>Ваша запись отменена</b>\n\n📅 <b>Дата:</b> ${esc(dateFormatted)}\n⏰ <b>Время:</b> ${data.start_time.substring(0, 5)} — ${data.end_time.substring(0, 5)}\n💅 <b>Услуги:</b> ${esc(serviceNames)}\n\nЕсли хотите записаться на другое время — просто напишите нам 🌸`,
              parse_mode: 'HTML',
            }),
          });
        }
        // Администраторам — кто отменил (видно в чате что запись снята)
        if (chatIds.length) {
          const msg = `🔴 <b>Запись отменена администратором</b>\n\n👤 <b>Клиент:</b> ${esc(profile?.name)}\n📅 <b>Дата:</b> ${esc(dateFormatted)}\n⏰ <b>Время:</b> ${data.start_time.substring(0, 5)} — ${data.end_time.substring(0, 5)}\n💅 <b>Услуги:</b> ${esc(serviceNames)}`;
          await Promise.allSettled(chatIds.map(chatId =>
            fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
            })
          ));
        }
      } else if (status === 'completed') {
        // Клиенту — визит завершён
        if (clientChatId) {
          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: clientChatId,
              text: `✅ <b>Визит завершён!</b>\n\nСпасибо, что выбрали нас 🌸\n💅 <b>Услуги:</b> ${esc(serviceNames)}\n\nБудем рады видеть вас снова! Если вам всё понравилось — пожалуйста, оставьте отзыв, это очень важно для нас 🙏\n\n⭐ <a href="https://ya.cc/t/UtKOGC5i9QoAAb">Оставить отзыв</a>`,
              parse_mode: 'HTML',
            }),
          });
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
