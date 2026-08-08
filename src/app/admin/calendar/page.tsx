'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, User, CalendarDays, Send } from 'lucide-react';

interface ScheduleException {
  id: string;
  date: string;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface AppointmentItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  client: { name: string; phone: string; telegram_username?: string | null };
  services: { id: string; name: string; duration_minutes: number; price: number }[];
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const STATUS_LABELS: Record<string, string> = {
  active: 'Ожидается',
  completed: 'Завершено',
  pending_payment: 'Ожидает оплату',
  cancelled_by_admin: 'Отменено',
  cancelled_by_client: 'Отменено',
};

export default function AdminCalendarPage() {
  const now = new Date();
  const [displayDate, setDisplayDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState<Record<string, ScheduleException>>({});
  const [monthAppointments, setMonthAppointments] = useState<Record<string, AppointmentItem[]>>({});
  const [loading, setLoading] = useState(false);

  const year = displayDate.getFullYear();
  const monthIndex = displayDate.getMonth();
  const month = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const today = toDateKey(now);

  useEffect(() => {
    setSelectedDate(null);
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/schedule?month=${month}`).then(r => r.json()),
      fetch(`/api/admin/appointments?month=${month}`).then(r => r.json()),
    ])
      .then(([excData, appData]: [ScheduleException[], AppointmentItem[]]) => {
        const excMap: Record<string, ScheduleException> = {};
        if (Array.isArray(excData)) excData.forEach(ex => { excMap[ex.date] = ex; });
        setExceptions(excMap);

        const appMap: Record<string, AppointmentItem[]> = {};
        if (Array.isArray(appData)) {
          appData.forEach(app => {
            if (!appMap[app.date]) appMap[app.date] = [];
            appMap[app.date].push(app);
          });
        }
        setMonthAppointments(appMap);
      })
      .finally(() => setLoading(false));
  }, [month]);

  // Сетка календаря
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startDow = (firstDayOfMonth.getDay() + 6) % 7; // Пн = 0
  const days: (string | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateKey(new Date(year, monthIndex, i + 1))
    ),
  ];
  while (days.length % 7 !== 0) days.push(null);

  // Выбранный день
  const selectedEx = selectedDate ? exceptions[selectedDate] : null;
  const isWorking = selectedEx?.is_working ?? false;
  const workingHours =
    isWorking && selectedEx?.start_time && selectedEx?.end_time
      ? { start: selectedEx.start_time.substring(0, 5), end: selectedEx.end_time.substring(0, 5) }
      : null;

  const selectedAppts = selectedDate
    ? [...(monthAppointments[selectedDate] ?? [])].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      )
    : [];

  // 30-минутные слоты
  const timeSlots: string[] = [];
  if (workingHours) {
    const startMins = toMins(workingHours.start);
    const endMins = toMins(workingHours.end);
    for (let mins = startMins; mins < endMins; mins += 30) {
      timeSlots.push(`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`);
    }
  }

  const getSlotAppointment = (time: string): AppointmentItem | null => {
    const slotStart = toMins(time);
    const slotEnd = slotStart + 30;
    return (
      selectedAppts
        .filter(a => a.status !== 'cancelled_by_client' && a.status !== 'cancelled_by_admin')
        .find(a => {
          const aStart = toMins(a.startTime.substring(0, 5));
          const aEnd = toMins(a.endTime.substring(0, 5));
          return slotStart < aEnd && slotEnd > aStart;
        }) ?? null
    );
  };

  const formatDayHeader = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  };

  const activeCount = (dateKey: string) =>
    (monthAppointments[dateKey] ?? []).filter(a => a.status === 'active').length;

  return (
    <div className="space-y-8 lg:space-y-10 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-3">
          Календарь{' '}
          <span style={{ color: '#D14D72' }} className="italic">расписания</span>
        </h1>
        <p className="text-zinc-400 font-medium uppercase text-[9px] md:text-[10px] tracking-[0.2em]">
          Рабочие дни и свободное время
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">

        {/* ── Календарь ── */}
        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setDisplayDate(new Date(year, monthIndex - 1, 1))}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-50 transition-colors border border-zinc-100"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">
              {MONTH_NAMES[monthIndex]} {year}
            </h2>
            <button
              onClick={() => setDisplayDate(new Date(year, monthIndex + 1, 1))}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-50 transition-colors border border-zinc-100"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DOW.map(d => (
              <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-300 py-2">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div
                className="animate-spin rounded-full h-8 w-8 border-t-2"
                style={{ borderTopColor: '#D14D72' }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 md:gap-1.5">
              {days.map((dateKey, i) => {
                if (!dateKey) return <div key={i} />;
                const ex = exceptions[dateKey];
                const working = ex?.is_working ?? false;
                const isSelected = selectedDate === dateKey;
                const isToday = dateKey === today;
                const count = activeCount(dateKey);
                const dayNum = parseInt(dateKey.split('-')[2]);
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className="relative flex flex-col items-center justify-center rounded-xl md:rounded-2xl transition-all duration-200 aspect-square font-black"
                    style={{
                      backgroundColor: isSelected ? '#D14D72' : working ? '#FDF2F5' : '#F9F9F9',
                      color: isSelected ? 'white' : working ? '#D14D72' : '#C4C4C8',
                      boxShadow: isSelected ? '0 6px 20px rgba(209,77,114,0.3)' : 'none',
                      outline: isToday && !isSelected ? '2px solid #D14D72' : 'none',
                      outlineOffset: '-2px',
                    }}
                  >
                    <span className="text-sm md:text-base font-black leading-none">{dayNum}</span>
                    {count > 0 && (
                      <span
                        className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center"
                        style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.35)' : '#D14D72', color: 'white' }}
                      >
                        {count}
                      </span>
                    )}
                    {working && !isSelected && count === 0 && (
                      <span className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: '#D14D72', opacity: 0.4 }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-5 mt-8 pt-6 border-t border-zinc-50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg" style={{ backgroundColor: '#FDF2F5' }} />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Рабочий</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-zinc-100" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Выходной</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-black" style={{ backgroundColor: '#D14D72' }}>
                2
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Записей</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-zinc-100" style={{ outline: '2px solid #D14D72', outlineOffset: '-2px' }} />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Сегодня</span>
            </div>
          </div>
        </div>

        {/* ── Детали дня ── */}
        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden lg:sticky" style={{ top: '2rem' }}>
          <AnimatePresence mode="wait">
            {!selectedDate ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-12 min-h-[420px]"
              >
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mb-6">
                  <CalendarDays size={32} />
                </div>
                <p className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.2em] text-center leading-loose">
                  Выберите день<br />для просмотра расписания
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div className="p-6 md:p-8 border-b border-zinc-50">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-1">Расписание</div>
                  <div className="text-base md:text-lg font-black uppercase tracking-tight text-[#0A0A0A] capitalize mb-2">
                    {formatDayHeader(selectedDate)}
                  </div>
                  {isWorking && workingHours ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} style={{ color: '#D14D72' }} />
                        <span className="text-[11px] font-bold text-zinc-500">
                          {workingHours.start} — {workingHours.end}
                        </span>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest"
                        style={{ backgroundColor: '#FDF2F5', color: '#D14D72' }}
                      >
                        {selectedAppts.filter(a => a.status === 'active').length} активных
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-400 text-[9px] font-black uppercase tracking-widest">
                      Выходной день
                    </span>
                  )}
                </div>

                <div className="p-6 md:p-8 max-h-[560px] overflow-y-auto">
                  {!isWorking ? (
                    <div className="py-12 text-center">
                      <p className="text-zinc-200 font-black uppercase text-xs tracking-widest">Нерабочий день</p>
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-zinc-200 font-black uppercase text-xs tracking-widest">Нет рабочих часов</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timeSlots.map(time => {
                        const appt = getSlotAppointment(time);
                        const isApptStart = appt
                          ? toMins(appt.startTime.substring(0, 5)) === toMins(time)
                          : false;
                        if (appt && !isApptStart) return null;

                        if (appt) {
                          const isCompleted = appt.status === 'completed';
                          const isPending = appt.status === 'pending_payment';
                          const accent = isCompleted ? '#22C55E' : isPending ? '#F59E0B' : '#D14D72';
                          const bg = isCompleted ? '#F0FDF4' : isPending ? '#FFFBEB' : '#FDF2F5';
                          const border = isCompleted ? '#BBF7D0' : isPending ? '#FDE68A' : '#FBCFE8';
                          return (
                            <motion.div
                              key={`appt-${appt.id}`}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="rounded-2xl p-4 border"
                              style={{ backgroundColor: bg, borderColor: border }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: accent, minHeight: '48px' }} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
                                      {appt.startTime.substring(0, 5)} — {appt.endTime.substring(0, 5)}
                                    </span>
                                    <span className="text-sm font-black flex-shrink-0" style={{ color: accent }}>{appt.totalPrice} ₽</span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <User size={11} className="text-zinc-400 flex-shrink-0" />
                                    <span className="text-sm font-black uppercase tracking-tight text-[#0A0A0A] truncate">
                                      {appt.client?.name || 'Клиент'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-medium italic truncate mb-1.5">
                                    {appt.services?.map(s => s.name).join(', ')}
                                  </div>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {appt.client?.telegram_username && (
                                      <a
                                        href={`https://t.me/${appt.client.telegram_username}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[9px] font-black text-[#2AABEE]"
                                      >
                                        <Send size={9} />
                                        @{appt.client.telegram_username}
                                      </a>
                                    )}
                                    <span
                                      className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                      style={{ backgroundColor: accent + '18', color: accent }}
                                    >
                                      {STATUS_LABELS[appt.status] ?? appt.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        }

                        return (
                          <div key={time} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                            <span className="text-[11px] font-black text-zinc-300 w-11 flex-shrink-0 tabular-nums">{time}</span>
                            <div className="flex-1 border-t border-dashed border-zinc-100" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-200">Свободно</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
