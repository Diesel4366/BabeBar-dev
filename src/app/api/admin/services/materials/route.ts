import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminToken } from '@/lib/auth';

async function checkAuth(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  const cookieHeader = req.headers.get('cookie') || '';
  const adminSession = cookieHeader.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];
  return !(!adminSession || !secret || !(await verifyAdminToken(adminSession, secret)));
}

export async function GET(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get('serviceId');

  if (!serviceId) return NextResponse.json({ error: 'Missing serviceId' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('service_materials')
    .select(`
      id,
      amount,
      material_id,
      inventory_items (id, name, unit)
    `)
    .eq('service_id', serviceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const { serviceId, materialId, amount } = body;

  const { data, error } = await supabaseAdmin
    .from('service_materials')
    .upsert({ service_id: serviceId, material_id: materialId, amount }, { onConflict: 'service_id,material_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const { error } = await supabaseAdmin
    .from('service_materials')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
