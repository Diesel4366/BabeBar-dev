import { verifyAdminToken } from '@/lib/auth';

export async function checkAdminAuth(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.split(';').find(c => c.trim().startsWith('admin_session='));
  const session = match?.split('=').slice(1).join('=').trim();
  if (!session || !secret) return false;
  return verifyAdminToken(session, secret);
}
