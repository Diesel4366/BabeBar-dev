import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminToken } from '@/lib/auth';

async function checkAuth(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  const cookie = req.headers.get('cookie') || '';
  const session = cookie.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];
  return !(!session || !secret || !(await verifyAdminToken(session, secret)));
}

// GET — список документов поступления
export async function GET(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('inventory_receipts')
    .select(`
      id, number, date, supplier, comment, created_at,
      inventory_receipt_items (
        id, quantity, price_per_unit,
        inventory_items (id, name, unit)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — создать документ поступления (+ пополнить остатки)
export async function POST(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { date, supplier, comment, items } = body as {
    date: string;
    supplier?: string;
    comment?: string;
    items: { item_id: string; quantity: number; price_per_unit?: number }[];
  };

  if (!items || items.length === 0)
    return NextResponse.json({ error: 'Нет строк в документе' }, { status: 400 });

  // Генерируем номер документа
  const { count } = await supabaseAdmin
    .from('inventory_receipts')
    .select('*', { count: 'exact', head: true });
  const number = `ПП-${String((count ?? 0) + 1).padStart(3, '0')}`;

  // Создаём шапку
  const { data: receipt, error: rErr } = await supabaseAdmin
    .from('inventory_receipts')
    .insert({ number, date, supplier: supplier || null, comment: comment || null })
    .select()
    .single();

  if (rErr || !receipt) return NextResponse.json({ error: rErr?.message }, { status: 500 });

  // Создаём строки
  const lines = items.map(i => ({
    receipt_id: receipt.id,
    item_id: i.item_id,
    quantity: i.quantity,
    price_per_unit: i.price_per_unit ?? null,
  }));

  const { error: lErr } = await supabaseAdmin
    .from('inventory_receipt_items')
    .insert(lines);

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  // Пополняем actual_stock для каждого материала
  for (const item of items) {
    const { data: current } = await supabaseAdmin
      .from('inventory_items')
      .select('actual_stock')
      .eq('id', item.item_id)
      .single();

    if (current) {
      await supabaseAdmin
        .from('inventory_items')
        .update({ actual_stock: current.actual_stock + item.quantity })
        .eq('id', item.item_id);
    }
  }

  return NextResponse.json({ success: true, receipt });
}

// DELETE — удалить документ (откатываем остатки)
export async function DELETE(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Сначала получаем строки чтобы откатить остатки
  const { data: lines } = await supabaseAdmin
    .from('inventory_receipt_items')
    .select('item_id, quantity')
    .eq('receipt_id', id);

  if (lines) {
    for (const line of lines) {
      const { data: current } = await supabaseAdmin
        .from('inventory_items')
        .select('actual_stock')
        .eq('id', line.item_id)
        .single();
      if (current) {
        await supabaseAdmin
          .from('inventory_items')
          .update({ actual_stock: current.actual_stock - line.quantity })
          .eq('id', line.item_id);
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('inventory_receipts')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
