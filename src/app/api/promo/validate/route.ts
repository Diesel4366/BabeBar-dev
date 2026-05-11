import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/userAuth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ valid: false, error: 'Укажите промокод' });

  let profileId: string | null = null;
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (token) profileId = await verifyUserToken(token, process.env.ADMIN_SECRET!);

  const { data: promo } = await supabaseAdmin
    .from('promo_codes')
    .select('id, discount_percent, is_active, profile_id, max_uses, used_count, expires_at')
    .eq('code', code)
    .maybeSingle();

  if (!promo) return NextResponse.json({ valid: false, error: 'Промокод не найден' });
  if (!promo.is_active) return NextResponse.json({ valid: false, error: 'Промокод неактивен' });
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Срок действия промокода истёк' });
  }
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: 'Промокод уже исчерпан' });
  }
  if (promo.profile_id && promo.profile_id !== profileId) {
    return NextResponse.json({ valid: false, error: 'Промокод предназначен другому клиенту' });
  }

  return NextResponse.json({ valid: true, codeId: promo.id, percent: promo.discount_percent });
}
