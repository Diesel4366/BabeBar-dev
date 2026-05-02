'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Calendar, Clock, User, Apple, CheckCircle2 } from 'lucide-react';

interface BookingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    date: string;
    time: string;
    services: { name: string }[];
    totalPrice: number;
  } | null;
}

export default function BookingSuccessModal({ isOpen, onClose, data }: BookingSuccessModalProps) {
  useEffect(() => {
    if (isOpen && window.navigator.vibrate) {
      // Легкая "премиальная" вибрация при успехе
      window.navigator.vibrate([10, 30, 10]);
    }
  }, [isOpen]);

  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with heavy blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] cursor-pointer"
          />

          {/* Apple Pay Style Sheet */}
          <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[101] pointer-events-none p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl pointer-events-auto"
            >
              {/* Header with animated check */}
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
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                    >
                      <motion.path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  </motion.div>
                </div>
                
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[#0A0A0A] mb-1">
                  Готово, вы <span className="text-primary italic">записаны!</span>
                </h2>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">BABEBAR BEAUTY STUDIO</p>
              </div>

              {/* Receipt Content */}
              <div className="px-10 pb-10 space-y-8">
                {/* The "Paper" Receipt Effect */}
                <div className="bg-zinc-50 rounded-[2rem] p-8 border border-zinc-100 relative overflow-hidden">
                   <div className="space-y-6 relative z-10">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 block mb-2">Услуги</span>
                        <div className="space-y-1">
                          {data.services.map((s, i) => (
                            <div key={i} className="text-sm font-bold text-[#0A0A0A] uppercase tracking-tight">💅 {s.name}</div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-end border-t border-zinc-200 pt-6">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 block mb-1">Дата и время</span>
                          <div className="text-xl font-black text-[#0A0A0A] uppercase tracking-tighter">
                            {data.date} | {data.time}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 block mb-1">К оплате</span>
                          <div className="text-xl font-black text-primary">{data.totalPrice} ₽</div>
                        </div>
                      </div>
                   </div>
                   {/* Decor Circles for Receipt punch holes */}
                   <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white border border-zinc-100 rounded-full" />
                   <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white border border-zinc-100 rounded-full" />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const [day, monthName] = data.date.split(' ');
                      const year = new Date().getFullYear();
                      
                      // Маппинг месяцев для создания корректной даты
                      const months: Record<string, string> = {
                        'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04', 'мая': '05', 'июня': '06',
                        'июля': '07', 'августа': '08', 'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
                      };
                      
                      const month = months[monthName.toLowerCase()] || '01';
                      const dateStr = `${year}${month}${day.padStart(2, '0')}`;
                      const startTime = data.time.replace(':', '');
                      
                      // Создаем Google Calendar Link
                      const title = encodeURIComponent(`BABEBAR: ${data.services.map(s => s.name).join(', ')}`);
                      const details = encodeURIComponent('Ждем вас в нашей студии! Если планы изменятся, пожалуйста, предупредите нас заранее.');
                      const location = encodeURIComponent('Нижний Новгород, ул. Сазанова 2А');
                      const dates = `${dateStr}T${startTime}00/${dateStr}T${startTime}00`; // Упрощенно начало=конец для календаря
                      
                      const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
                      window.open(url, '_blank');
                    }}
                    className="w-full py-5 rounded-2xl bg-[#0A0A0A] text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-3 group"
                  >
                    <Calendar size={16} className="group-hover:rotate-12 transition-transform" />
                    Добавить в календарь
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-5 rounded-2xl bg-zinc-100 text-[#0A0A0A] font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-sm"
                  >
                    Закрыть
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-zinc-300 text-[9px] font-bold uppercase tracking-widest">
                    Вам придет напоминание в Telegram за 2 часа до визита
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
