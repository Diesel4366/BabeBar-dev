import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/adminAuth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdminAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    name?: string;
    phone?: string;
    nickname?: string;
    telegram_username?: string;
    telegram_id?: string;
    vk_id?: string;
  };

  const update: Record<string, string | null> = {};
  for (const key of ['name', 'phone', 'nickname', 'telegram_username', 'telegram_id', 'vk_id'] as const) {
    if (key in body) update[key] = body[key] || null;
  }

  const { error } = await supabaseAdmin.from('profiles').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
