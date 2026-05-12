import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { verifyUserToken } from '@/lib/userAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import MiniAppAutoAuth from '@/components/MiniAppAutoAuth';
import VkAuthButton from '@/components/VkAuthButton';

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const store = await cookies();
  const token = store.get('user_session')?.value;
  if (token) {
    const id = await verifyUserToken(token, process.env.ADMIN_SECRET!);
    if (id) {
      const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', id).maybeSingle();
      if (data) redirect('/profile');
    }
  }

  const sp = await props.searchParams;
  const errorMsg = sp.error;
  const hasError = !!errorMsg;

  const headersList = await headers();
  const host = headersList.get('host') ?? 'babebar.ru';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const clientId = '8752821995';
  const redirectUri = `${proto}://${host}/api/auth/telegram/callback`;

  const telegramAuthUrl = `https://oauth.telegram.org/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile`;

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
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold text-center uppercase tracking-widest leading-relaxed">
            {errorMsg === '1' ? 'Ошибка авторизации — попробуйте ещё раз' : `Ошибка: ${decodeURIComponent(errorMsg)}`}
          </div>
        )}

        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-8 space-y-4">
          <Suspense>
            <MiniAppAutoAuth />
          </Suspense>
          <a
            href={telegramAuthUrl}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-blue-500/20"
            style={{ backgroundColor: '#2AABEE' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.483c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.48 14.51l-2.95-.924c-.642-.2-.654-.642.136-.953l11.527-4.445c.535-.194 1.003.13.37.06z\"/>
            </svg>
            Войти через Telegram
          </a>

          <VkAuthButton state="" />

          <div className="relative py-2">
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
        <p className="text-center mt-2 text-[8px] text-zinc-200 uppercase tracking-[0.3em]">
          v.02.85.error-tracking
        </p>
      </div>
    </div>
  );
}
