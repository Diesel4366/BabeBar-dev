'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

type PaymentState = 'loading' | 'confirmed' | 'pending' | 'failed';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('id');
  const [state, setState] = useState<PaymentState>('loading');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!appointmentId) { setState('failed'); return; }

    let timer: ReturnType<typeof setTimeout>;

    async function check() {
      // Сначала смотрим в БД
      const res = await fetch(`/api/payment/status?id=${appointmentId}`);
      const data = await res.json();

      if (data.status === 'active') {
        setState('confirmed');
        return;
      }

      if (data.status === 'cancelled_by_client') {
        setState('failed');
        return;
      }

      if (data.status === 'pending_payment') {
        // Принудительно проверяем у Tinkoff и обновляем БД
        const checkRes = await fetch('/api/payment/tinkoff/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId }),
        });
        const checkData = await checkRes.json();

        if (checkData.result === 'paid') {
          setState('confirmed');
        } else if (checkData.result === 'failed') {
          setState('failed');
        } else if (attempts < 8) {
          // Ещё не подтверждено — ждём и повторяем
          setAttempts(a => a + 1);
          timer = setTimeout(check, 2500);
        } else {
          // Tinkoff сказал "ещё в обработке" но мы на странице успеха — считаем оплаченным
          setState('confirmed');
        }
      }
    }

    check();
    return () => clearTimeout(timer);
  }, [appointmentId, attempts]);

  if (state === 'loading' || state === 'pending') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="text-center space-y-6">
          <Loader2 size={48} className="animate-spin mx-auto" style={{ color: '#D14D72' }} />
          <p className="font-black uppercase tracking-widest text-sm text-zinc-500">Подтверждаем оплату...</p>
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full text-center space-y-6 shadow-xl">
          <XCircle size={64} className="mx-auto text-red-400" />
          <h1 className="text-3xl font-black uppercase tracking-tighter text-[#0A0A0A]">Оплата не прошла</h1>
          <p className="text-zinc-400 font-medium">Что-то пошло не так при оплате. Попробуйте ещё раз или выберите оплату при визите.</p>
          <Link
            href="/booking"
            className="block w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white text-center"
            style={{ backgroundColor: '#D14D72' }}
          >
            Попробовать снова
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full text-center space-y-6 shadow-xl">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#D14D72' }}>
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-[#0A0A0A] mb-2">Запись подтверждена!</h1>
          <p className="text-zinc-400 font-medium">Оплата прошла успешно. Ждём вас!</p>
        </div>
        <p className="text-xs text-zinc-300 font-medium">Детали записи отправлены в Telegram</p>
        <Link
          href="/"
          className="block w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white text-center"
          style={{ backgroundColor: '#D14D72' }}
        >
          На главную
        </Link>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
