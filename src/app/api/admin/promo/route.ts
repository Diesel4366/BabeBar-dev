import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*, profile:profiles(id, name, phone)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const { code, discount_percent, profile_id, max_uses, expires_at } = await req.json();
  if (!code?.trim() || !discount_percent) {
    return NextResponse.json({ error: 'Код и процент скидки обязательны' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('promo_codes')
    .insert([{
      code: code.trim().toUpperCase(),
      discount_percent: Number(discount_percent),
      profile_id: profile_id || null,
      max_uses: max_uses ? Number(max_uses) : null,
      expires_at: expires_at || null,
    }])
    .select('*, profile:profiles(id, name, phone)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { id, is_active } = await req.json();
  const { error } = await supabaseAdmin.from('promo_codes').update({ is_active }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('promo_codes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
