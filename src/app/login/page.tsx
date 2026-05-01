import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/userAuth';
import { redirect } from 'next/navigation';

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (token) {
    const id = await verifyUserToken(token, process.env.ADMIN_SECRET!);
    if (id) redirect('/profile');
  }

  const sp = await props.searchParams;
  const hasError = !!sp.error;

  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const telegramAuthUrl = `https://oauth.telegram.org/auth?bot_id=${clientId}&scope=users:read&origin=https://babebar.ru&return_to=https://babebar.ru/api/auth/telegram/callback`;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-12">
          <Link href="/" className="text-3xl font-black tracking-tighter text-[#0A0A0A] inline-block mb-8">
            BABE<span style={{ color: '#D14D72' }} className="italic">BAR</span>
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Личный кабинет</h1>
          <p className="text-zinc-400 font-medium text-sm">Войдите, чтобы видеть свои записи</p>
        </div>

        {hasError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-500 text-xs font-bold text-center uppercase tracking-widest">
            Ошибка авторизации — попробуйте ещё раз
          </div>
        )}

        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-8 space-y-6">
          <a
            href={telegramAuthUrl}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#2AABEE' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.483c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.48 14.51l-2.95-.924c-.642-.2-.654-.642.136-.953l11.527-4.445c.535-.194 1.003.13.37.06z"/>
            </svg>
            Войти через Telegram
          </a>

          <div className="relative">
            <span className="absolute inset-x-0 top-1/2 h-px bg-zinc-100" />
            <span className="relative bg-white px-4 text-[10px] font-black text-zinc-300 uppercase tracking-widest flex justify-center">
              или
            </span>
          </div>

          <Link
            href="/booking"
            className="w-full flex items-center justify-center py-4 rounded-2xl border border-zinc-100 text-xs font-black uppercase tracking-widest text-zinc-500 hover:border-zinc-200 transition-all"
          >
            Записаться без регистрации
          </Link>
        </div>

        <p className="text-center mt-8 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
          Вы мастер?{' '}
          <Link href="/admin" className="text-zinc-400 hover:text-zinc-600 underline transition-colors">
            Войти в панель управления
          </Link>
        </p>
      </div>
    </div>
  );
}
