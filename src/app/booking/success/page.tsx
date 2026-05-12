'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

type PaymentState = 'loading' | 'confirmed' | 'failed';

interface AppointmentData {
  date: string;
  startTime: string;
  totalPrice: number;
  prepaidAmount: number;
  services: string[];
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('id');
  const [state, setState] = useState<PaymentState>('loading');
  const [attempts, setAttempts] = useState(0);
  const [appt, setAppt] = useState<AppointmentData | null>(null);

  useEffect(() => {
    if (!appointmentId) { setState('failed'); return; }

    let timer: ReturnType<typeof setTimeout>;

    async function check() {
      const res = await fetch(`/api/payment/status?id=${appointmentId}`);
      const data = await res.json();

      if (data.date) {
        setAppt({
          date: formatDate(data.date),
          startTime: data.startTime?.slice(0, 5) ?? '',
          totalPrice: data.totalPrice ?? 0,
          prepaidAmount: data.prepaidAmount ?? 0,
          services: data.services ?? [],
        });
      }

      if (data.status === 'active') {
        setState('confirmed');
        if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);
        return;
      }

      if (data.status === 'cancelled_by_client') {
        setState('failed');
        return;
      }

      if (data.status === 'pending_payment') {
        const checkRes = await fetch('/api/payment/tinkoff/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId }),
        });
        const checkData = await checkRes.json();

        if (checkData.result === 'paid') {
          setState('confirmed');
          if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);
        } else if (checkData.result === 'failed') {
          setState('failed');
        } else if (attempts < 8) {
          setAttempts(a => a + 1);
          timer = setTimeout(check, 2500);
        } else {
          setState('confirmed');
          if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);
        }
      }
    }

    check();
    return () => clearTimeout(timer);
  }, [appointmentId, attempts]);

  if (state === 'loading') {
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
          <p className="text-zinc-400 font-medium">Что-то пошло не так. Попробуйте ещё раз или выберите оплату при визите.</p>
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

  // Confirmed — Apple Pay style sheet
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-end sm:items-center justify-center p-4">
      <AnimatePresence>
        <motion.div
          initial={{ y: '100%', opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="pt-12 pb-8 flex flex-col items-center">
            <div className="relative mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20"
              >
                <motion.svg
                  viewBox="0 0 24 24"
                  className="w-12 h-12 text-white"
                >
                  <motion.path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  />
                </motion.svg>
              </motion.div>
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tighter text-[#0A0A0A] mb-1">
              Оплачено и <span className="italic" style={{ color: '#D14D72' }}>записаны!</span>
            </h2>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">BABEBAR BEAUTY STUDIO</p>
          </div>

          {/* Receipt */}
          <div className="px-10 pb-10 space-y-8">
            <div className="bg-zinc-50 rounded-[2rem] p-8 border border-zinc-100 relative overflow-hidden">
              <div className="space-y-6 relative z-10">
                {appt && appt.services.length > 0 && (
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 block mb-2">Услуги</span>
                    <div className="space-y-1">
                      {appt.services.map((name, i) => (
                        <div key={i} className="text-sm font-bold text-[#0A0A0A] uppercase tracking-tight">💅 {name}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end border-t border-zinc-200 pt-6">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 block mb-1">Дата и время</span>
                    <div className="text-xl font-black text-[#0A0A0A] uppercase tracking-tighter">
                      {appt ? `${appt.date} | ${appt.startTime}` : '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    {appt && appt.prepaidAmount > 0 && appt.prepaidAmount < appt.totalPrice ? (
                      <>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 block mb-1">Оплачено сейчас</span>
                        <div className="text-xl font-black" style={{ color: '#D14D72' }}>{appt.prepaidAmount} ₽</div>
                        <div className="text-[10px] font-bold text-zinc-400 mt-1">При визите: {appt.totalPrice - appt.prepaidAmount} ₽</div>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 block mb-1">Оплачено</span>
                        <div className="text-xl font-black" style={{ color: '#D14D72' }}>
                          {appt ? `${appt.prepaidAmount > 0 ? appt.prepaidAmount : appt.totalPrice} ₽` : '—'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* Receipt punch holes */}
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white border border-zinc-100 rounded-full" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white border border-zinc-100 rounded-full" />
            </div>

            <div className="space-y-3">
              {appt && (
                <button
                  onClick={() => {
                    const [day, monthName] = appt.date.split(' ');
                    const year = new Date().getFullYear();
                    const months: Record<string, string> = {
                      'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
                      'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
                      'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12',
                    };
                    const month = months[monthName?.toLowerCase()] ?? '01';
                    const dateStr = `${year}${month}${day.padStart(2, '0')}`;
                    const startTime = appt.startTime.replace(':', '');
                    const title = encodeURIComponent(`BABEBAR: ${appt.services.join(', ')}`);
                    const details = encodeURIComponent('Ждем вас в нашей студии! Если планы изменятся, пожалуйста, предупредите нас заранее.');
                    const location = encodeURIComponent('Нижний Новгород, ул. Сазанова 2А');
                    const dates = `${dateStr}T${startTime}00/${dateStr}T${startTime}00`;
                    window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`, '_blank');
                  }}
                  className="w-full py-5 rounded-2xl bg-[#0A0A0A] text-white font-black text-[10px] uppercase tracking-widest hover:opacity-80 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-3 group"
                >
                  <Calendar size={16} className="group-hover:rotate-12 transition-transform" />
                  Добавить в календарь
                </button>
              )}
              <Link
                href="/profile"
                className="block w-full py-5 rounded-2xl bg-zinc-100 text-[#0A0A0A] font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-sm text-center"
              >
                Мои записи
              </Link>
            </div>

            <div className="text-center pt-2">
              <p className="text-zinc-300 text-[9px] font-bold uppercase tracking-widest">
                Вам придёт напоминание в Telegram за 2 часа до визита
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
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
