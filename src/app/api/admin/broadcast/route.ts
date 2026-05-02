import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminToken } from '@/lib/auth';

const TOKEN = process.env.TELEGRAM_TOKEN;

async function sendMsg(chatId: string | number, text: string) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export async function POST(req: Request) {
  try {
    // 1. Auth Check
    const secret = process.env.ADMIN_SECRET;
    const cookieHeader = req.headers.get('cookie') || '';
    const adminSession = cookieHeader.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];

    if (!adminSession || !secret || !(await verifyAdminToken(adminSession, secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientIds, message, sendToAll } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    if (!TOKEN) {
      return NextResponse.json({ error: 'Telegram Token не настроен' }, { status: 500 });
    }

    let targets: { telegram_id: string | null; telegram_chat_id: string | null; name: string | null }[] = [];

    if (sendToAll) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('telegram_id, telegram_chat_id, name')
        .not('telegram_id', 'is', null);
      
      if (error) throw error;
      targets = data || [];
    } else if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('telegram_id, telegram_chat_id, name')
        .in('id', clientIds)
        .not('telegram_id', 'is', null);
      
      if (error) throw error;
      targets = data || [];
    } else {
      return NextResponse.json({ error: 'Не выбраны получатели' }, { status: 400 });
    }

    if (targets.length === 0) {
      return NextResponse.json({ error: 'Нет клиентов с подключенным Telegram' }, { status: 400 });
    }

    const results = {
      total: targets.length,
      success: 0,
      failure: 0,
      errors: [] as string[]
    };

    // Telegram rate limits: ~30 messages per second. 
    // For a salon, the client base is likely small, so we can send sequentially or with small batches.
    for (const target of targets) {
      const chatId = target.telegram_chat_id || target.telegram_id;
      if (!chatId) {
        results.failure++;
        continue;
      }

      try {
        const res = await sendMsg(chatId, message);
        if (res.ok) {
          results.success++;
        } else {
          const errData = await res.json();
          results.failure++;
          results.errors.push(`Ошибка для ${target.name || chatId}: ${errData.description}`);
        }
      } catch (e: any) {
        results.failure++;
        results.errors.push(`Ошибка сети для ${target.name || chatId}: ${e.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Broadcast API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
