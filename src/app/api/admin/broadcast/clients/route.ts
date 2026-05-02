import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const secret = process.env.ADMIN_SECRET;
    const cookieHeader = req.headers.get('cookie') || '';
    const adminSession = cookieHeader.split(';').find(c => c.trim().startsWith('admin_session='))?.split('=')[1];

    if (!adminSession || !secret || !(await verifyAdminToken(adminSession, secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, telegram_username, telegram_id, phone')
      .not('telegram_id', 'is', null)
      .order('name');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
