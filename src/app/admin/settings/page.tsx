'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X, Check, Trash2 } from 'lucide-react';

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

interface ScheduleException {
  id: string;
  date: string;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface DayModal {
  date: string;
  exception: ScheduleException | null;
}

function toMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function buildCalendar(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  // Monday-first: getDay() returns 0=Sun..6=Sat → convert to Mon=0
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function AdminSettings() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [exceptions, setExceptions] = useState<Record<string, ScheduleException>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<DayModal | null>(null);
  const [form, setForm] = useState({ is_working: false, start_time: '10:00', end_time: '21:00' });
  const [saving, setSaving] = useState(false);

  const fetchExceptions = useCallback(async (y: number, m: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/schedule?month=${toMonthKey(y, m)}`);
      const data: ScheduleException[] = await res.json();
      const map: Record<string, ScheduleException> = {};
      if (Array.isArray(data)) data.forEach(e => { map[e.date] = e; });
      setExceptions(map);
    } catch { /* silent */ }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchExceptions(year, month); }, [year, month, fetchExceptions]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const openDay = (date: Date) => {
    const key = date.toISOString().split('T')[0];
    const exception = exceptions[key] ?? null;
    setForm({
      is_working: exception ? exception.is_working : false,
      start_time: exception?.start_time?.substring(0, 5) ?? '10:00',
      end_time: exception?.end_time?.substring(0, 5) ?? '21:00',
    });
    setModal({ date: key, exception });
  };

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: modal.date,
          is_working: form.is_working,
          start_time: form.is_working ? form.start_time : null,
          end_time: form.is_working ? form.end_time : null,
        }),
      });
      setModal(null);
      await fetchExceptions(year, month);
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/schedule?date=${modal.date}`, { method: 'DELETE' });
      setModal(null);
      await fetchExceptions(year, month);
    } catch { /* silent */ }
    setSaving(false);
  };

  const todayKey = now.toISOString().split('T')[0];
  const cells = buildCalendar(year, month);

  const getDayState = (date: Date): 'working' | 'dayoff' | 'default' => {
    const key = date.toISOString().split('T')[0];
    const ex = exceptions[key];
    if (!ex) return 'default';
    return ex.is_working ? 'working' : 'dayoff';
  };

  return (
    <div className="bg-[#FAFAFA] min-h-screen pt-24 pb-12">
      <div className="container-custom max-w-xl">

        {/* Header */}
        <div className="flex items-center gap-6 mb-10">
          <Link href="/admin" className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-100 rounded-full hover:bg-zinc-50 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-[#0A0A0A] mb-1 tracking-tight uppercase">Расписание</h1>
            <p className="text-zinc-400 font-medium text-sm">Отмечай рабочие дни на календаре</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mb-6 px-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D14D72' }} />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Рабочий</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-zinc-200" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Выходной</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white border border-zinc-200" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Не указан</span>
          </div>
        </div>

        {/* Calendar card */}
        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-6">

          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-zinc-50 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-black text-lg uppercase tracking-tight">
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-zinc-50 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-300 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;

                const key = date.toISOString().split('T')[0];
                const state = getDayState(date);
                const isToday = key === todayKey;
                const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const ex = exceptions[key];

                return (
                  <button
                    key={key}
                    onClick={() => openDay(date)}
                    disabled={isPast}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all duration-200 ${
                      isPast ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 cursor-pointer active:scale-95'
                    }`}
                    style={{
                      backgroundColor:
                        state === 'working' ? '#fce7ed'
                        : state === 'dayoff' ? '#F4F4F5'
                        : 'transparent',
                      outline: isToday ? '2px solid #D14D72' : undefined,
                      outlineOffset: isToday ? '2px' : undefined,
                    }}
                  >
                    <span
                      className="text-sm font-black"
                      style={{
                        color:
                          state === 'working' ? '#D14D72'
                          : state === 'dayoff' ? '#A1A1AA'
                          : '#0A0A0A',
                      }}
                    >
                      {date.getDate()}
                    </span>
                    {state !== 'default' && (
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-0.5"
                        style={{ backgroundColor: state === 'working' ? '#D14D72' : '#D4D4D8' }}
                      />
                    )}
                    {state === 'working' && ex?.start_time && (
                      <span className="text-[8px] font-black leading-none" style={{ color: '#D14D72' }}>
                        {ex.start_time.substring(0, 5)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Day edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Настройка дня</div>
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {new Date(modal.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <button onClick={() => setModal(null)} className="text-zinc-300 hover:text-zinc-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Working / day off toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, is_working: true }))}
                  className="py-5 rounded-2xl border-2 text-[11px] font-black uppercase tracking-widest transition-all"
                  style={{
                    borderColor: form.is_working ? '#D14D72' : '#F4F4F5',
                    backgroundColor: form.is_working ? '#fce7ed' : '#FAFAFA',
                    color: form.is_working ? '#D14D72' : '#A1A1AA',
                  }}
                >
                  ✓ Рабочий
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, is_working: false }))}
                  className="py-5 rounded-2xl border-2 text-[11px] font-black uppercase tracking-widest transition-all"
                  style={{
                    borderColor: !form.is_working ? '#0A0A0A' : '#F4F4F5',
                    backgroundColor: !form.is_working ? '#0A0A0A' : '#FAFAFA',
                    color: !form.is_working ? 'white' : '#A1A1AA',
                  }}
                >
                  ✕ Выходной
                </button>
              </div>

              {/* Time inputs */}
              {form.is_working && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Рабочие часы</div>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className="flex-1 bg-[#FAFAFA] border border-zinc-100 rounded-2xl px-5 py-4 font-bold text-sm outline-none text-center"
                    />
                    <span className="text-zinc-300 font-black">—</span>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      className="flex-1 bg-[#FAFAFA] border border-zinc-100 rounded-2xl px-5 py-4 font-bold text-sm outline-none text-center"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 pt-0 space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary py-5 text-[11px] flex items-center justify-center gap-2"
              >
                {saving
                  ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  : <><Check size={16} /> СОХРАНИТЬ</>
                }
              </button>

              {modal.exception && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl border border-zinc-100 text-zinc-400 hover:text-red-500 hover:border-red-100 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Убрать настройку
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
