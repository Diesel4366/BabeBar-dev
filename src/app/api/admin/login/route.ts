import { NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function getIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function POST(req: Request) {
  const ip = getIp(req);
  const now = Date.now();
  const entry = attempts.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_ATTEMPTS) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return NextResponse.json(
        { error: `Слишком много попыток. Попробуйте через ${Math.ceil(retryAfter / 60)} мин.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }
  } else if (!entry || now >= entry.resetAt) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
  }

  const { password } = await req.json();
  const secret = process.env.ADMIN_SECRET;

  if (!secret || password !== secret) {
    const current = attempts.get(ip)!;
    current.count += 1;
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  }

  attempts.delete(ip);

  const token = await createAdminToken(secret);
  const res = NextResponse.json({ success: true });
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
