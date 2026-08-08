import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const TOKEN = process.env.TELEGRAM_TOKEN;

async function sendMsg(chatId: string | number, text: string) {
  if (!TOKEN) return;
  return fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

function shortId(id: string) {
  return id.replace(/-/g, '').substring(0, 8).toUpperCase();
}

// birthday is stored as 'YYYY-MM-DD', compare only MM-DD
function getMonthDay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { birthday: 0, return60: 0, return120: 0, errors: [] as string[] };

  try {
    await handleBirthdayPromos(results);
  } catch (e: any) {
    results.errors.push(`birthday: ${e.message}`);
  }

  try {
    await handleReturnPromos(results);
  } catch (e: any) {
    results.errors.push(`return: ${e.message}`);
  }

  return NextResponse.json(results);
}

async function handleBirthdayPromos(results: { birthday: number; errors: string[] }) {
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  const targetMonthDay = getMonthDay(twoDaysFromNow);
  const currentYear = new Date().getFullYear();

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, name, birthday, telegram_chat_id')
    .not('birthday', 'is', null)
    .not('telegram_chat_id', 'is', null);

  if (error) throw error;

  for (const profile of profiles ?? []) {
    try {
      const bdayDate = new Date(profile.birthday);
      if (getMonthDay(bdayDate) !== targetMonthDay) continue;

      const code = `BDAY_${shortId(profile.id)}_${currentYear}`;

      // Skip if promo for this year already exists
      const { data: existing } = await supabaseAdmin
        .from('promo_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      if (existing) continue;

      // expires_at = birthday of current year + 2 days
      const expiresAt = new Date(twoDaysFromNow);
      expiresAt.setDate(expiresAt.getDate() + 2); // birthday + 2 after
      expiresAt.setHours(23, 59, 59, 0);

      await supabaseAdmin.from('promo_codes').insert({
        code,
        discount_percent: 10,
        is_active: true,
        profile_id: profile.id,
        max_uses: 1,
        used_count: 0,
        expires_at: expiresAt.toISOString(),
      });

      const firstName = profile.name?.split(' ')[0] ?? 'Дорогой клиент';
      await sendMsg(
        profile.telegram_chat_id,
        `🎂 <b>С наступающим днём рождения, ${firstName}!</b>\n\n` +
        `Мы приготовили вам подарок — промокод на <b>10% скидку</b>:\n\n` +
        `<code>${code}</code>\n\n` +
        `Действует 5 дней (2 до и 2 после вашего праздника) только для вас.\n` +
        `Ждём вас в <b>BABEBAR</b> — сделаем день рождения ещё красивее! 🌸`,
      );

      results.birthday++;
    } catch (e: any) {
      results.errors.push(`birthday profile ${profile.id}: ${e.message}`);
    }
  }
}

async function handleReturnPromos(results: { return60: number; return120: number; errors: string[] }) {
  const now = new Date();
  const cutoff60 = new Date(now);
  cutoff60.setDate(cutoff60.getDate() - 60);
  const cutoff120 = new Date(now);
  cutoff120.setDate(cutoff120.getDate() - 120);

  // Get all profiles with telegram
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('id, name, telegram_chat_id')
    .not('telegram_chat_id', 'is', null);
  if (profErr) throw profErr;

  for (const profile of profiles ?? []) {
    try {
      // Find last completed appointment
      const { data: lastApp } = await supabaseAdmin
        .from('appointments')
        .select('date')
        .eq('client_id', profile.id)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastApp) continue; // никогда не был — не трогаем

      const lastDate = new Date(lastApp.date);
      const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / 86_400_000);

      // Check existing return promo
      const { data: existingPromos } = await supabaseAdmin
        .from('promo_codes')
        .select('id, code, discount_percent, is_active')
        .eq('profile_id', profile.id)
        .like('code', 'RETURN%')
        .eq('is_active', true);

      const has30 = existingPromos?.some(p => p.discount_percent === 30);
      const has20 = existingPromos?.some(p => p.discount_percent === 20);

      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);
      expiresAt.setHours(23, 59, 59, 0);

      const firstName = profile.name?.split(' ')[0] ?? 'Дорогой клиент';

      if (daysSinceLast >= 120 && !has30) {
        // Upgrade or create 30% promo
        if (has20) {
          // Deactivate old 20% promos
          await supabaseAdmin
            .from('promo_codes')
            .update({ is_active: false })
            .eq('profile_id', profile.id)
            .like('code', 'RETURN%')
            .eq('discount_percent', 20);
        }

        const code = `RETURN120_${shortId(profile.id)}`;
        await supabaseAdmin.from('promo_codes').insert({
          code,
          discount_percent: 30,
          is_active: true,
          profile_id: profile.id,
          max_uses: 1,
          used_count: 0,
          expires_at: expiresAt.toISOString(),
        });

        await sendMsg(
          profile.telegram_chat_id,
          `💔 <b>${firstName}, мы очень скучаем по вам!</b>\n\n` +
          `Прошло уже 4 месяца... Возвращайтесь, мы приготовили для вас специальный промокод на <b>30% скидку</b>:\n\n` +
          `<code>${code}</code>\n\n` +
          `Действует 30 дней, только для вас, один раз.\n` +
          `Запишитесь на babebar.ru — ждём вас! 🌸`,
        );

        results.return120++;
      } else if (daysSinceLast >= 60 && daysSinceLast < 120 && !has20 && !has30) {
        const code = `RETURN60_${shortId(profile.id)}`;
        await supabaseAdmin.from('promo_codes').insert({
          code,
          discount_percent: 20,
          is_active: true,
          profile_id: profile.id,
          max_uses: 1,
          used_count: 0,
          expires_at: expiresAt.toISOString(),
        });

        await sendMsg(
          profile.telegram_chat_id,
          `💅 <b>${firstName}, мы скучаем по вам!</b>\n\n` +
          `Прошло уже 2 месяца с вашего последнего визита. Возвращайтесь — для вас промокод на <b>20% скидку</b>:\n\n` +
          `<code>${code}</code>\n\n` +
          `Действует 30 дней, только для вас, один раз.\n` +
          `Запишитесь на babebar.ru — ждём вас! 🌸`,
        );

        results.return60++;
      }
    } catch (e: any) {
      results.errors.push(`return profile ${profile.id}: ${e.message}`);
    }
  }
}
