'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, User, Phone,
  CheckCircle2, XCircle, Search, Filter, X, Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AppointmentStatus = 'active' | 'cancelled_by_client' | 'cancelled_by_admin' | 'completed';

interface AppointmentItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  totalPrice: number;
  client: { name: string; phone: string; telegram_username?: string | null };
  services: { name: string }[];
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  active: 'Ожидается',
  completed: 'Завершено',
  cancelled_by_admin: 'Отменено вами',
  cancelled_by_client: 'Отменено клиентом',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  active: 'bg-blue-50 text-blue-600 border-blue-100',
  completed: 'bg-green-50 text-green-600 border-green-100',
  cancelled_by_admin: 'bg-red-50 text-red-600 border-red-100',
  cancelled_by_client: 'bg-red-50 text-red-600 border-red-100',
};

type DateFilter = 'all' | 'today' | 'week';
type StatusFilter = 'all' | AppointmentStatus;

const PAGE_SIZE = 20;

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchAppointments = useCallback(async (
    p: number, status: StatusFilter, date: DateFilter, search: string
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), status, dateFilter: date });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/appointments?${params}`);
      const json = await res.json();
      if (json.data) {
        setAppointments(json.data);
        setTotal(json.total);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments(page, statusFilter, dateFilter, debouncedSearch);
  }, [page, statusFilter, dateFilter, debouncedSearch, fetchAppointments]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setAppointments(prev =>
          prev.map(app => app.id === id ? { ...app, status: status as AppointmentStatus } : app)
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (dateFilter !== 'all' ? 1 : 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-8 lg:space-y-12 max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-3">
            Управление <span className="text-primary italic">записями</span>
          </h1>
          <p className="text-zinc-400 font-medium uppercase text-[9px] md:text-[10px] tracking-[0.2em]">
            {total} записей в базе
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); resetPage(); }}
              className="w-full bg-white pl-14 pr-6 py-4 rounded-2xl border border-zinc-100 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-sm outline-none transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`bg-white border px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-3 transition-all relative shadow-sm h-[54px] sm:h-auto ${
              showFilters || activeFiltersCount > 0 ? 'border-primary text-primary' : 'border-zinc-100 hover:border-zinc-300'
            }`}
          >
            <Filter size={14} />
            Фильтры
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-[1.8rem] border border-zinc-100 p-6 md:p-8 space-y-6 shadow-sm">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">Статус записи</div>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'active', 'completed', 'cancelled_by_admin', 'cancelled_by_client'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); resetPage(); }}
                        className={`px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                          statusFilter === s ? 'bg-[#0A0A0A] text-white shadow-lg shadow-black/10' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                        }`}
                      >
                        {s === 'all' ? 'Все' : STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">Период</div>
                  <div className="flex flex-wrap gap-2">
                    {([['all', 'За всё время'], ['today', 'Сегодня'], ['week', 'Неделя']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => { setDateFilter(val); resetPage(); }}
                        className={`px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                          dateFilter === val ? 'bg-[#0A0A0A] text-white shadow-lg shadow-black/10' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { setStatusFilter('all'); setDateFilter('all'); resetPage(); }}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors pt-1"
                  >
                    <X size={12} />
                    Сбросить всё
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {appointments.length > 0 ? (
            appointments.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-[2rem] border border-zinc-100 p-6 md:p-10 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 group"
              >
                <div className="flex flex-col lg:flex-row justify-between gap-6 md:gap-10">
                  <div className="flex gap-4 md:gap-8 items-start">
                    <div className="w-12 h-12 md:w-20 md:h-20 bg-zinc-50 rounded-2xl md:rounded-3xl flex items-center justify-center text-zinc-400 flex-shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      <User size={24} className="md:w-8 md:h-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight text-[#0A0A0A] leading-none truncate max-w-[200px] md:max-w-none">
                          {app.client?.name || 'Без имени'}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border shadow-sm ${STATUS_COLORS[app.status]}`}>
                          {STATUS_LABELS[app.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] md:text-xs font-bold text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-primary" />
                          <span className="text-[#0A0A0A] whitespace-nowrap">{app.client?.phone || '—'}</span>
                        </div>
                        {app.client?.telegram_username && (
                          <a
                            href={`https://t.me/${app.client.telegram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 transition-all hover:scale-105 text-[#2AABEE]"
                          >
                            <Send size={12} />
                            <span className="truncate max-w-[100px]">@{app.client.telegram_username}</span>
                          </a>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-primary" />
                          <span className="uppercase tracking-tight whitespace-nowrap">{new Date(app.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-primary" />
                          <span className="font-black text-[#0A0A0A] whitespace-nowrap">{app.startTime.substring(0, 5)}—{app.endTime.substring(0, 5)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 lg:text-right border-t border-zinc-50 pt-6 lg:border-t-0 lg:pt-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">Услуги</div>
                      <div className="text-xs md:text-sm font-black text-[#0A0A0A] uppercase tracking-tight italic line-clamp-1">
                        {app.services?.map(s => s.name).join(', ')}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">Сумма</div>
                      <div className="text-2xl md:text-3xl font-black text-primary leading-none">{app.totalPrice} ₽</div>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t lg:border-t-0 lg:border-l border-zinc-50 pt-6 lg:pt-0 lg:pl-10">
                    {app.status === 'active' && (
                      <>
                        <button
                          onClick={() => updateStatus(app.id, 'completed')}
                          className="flex-1 lg:flex-none bg-green-500 hover:bg-green-600 text-white px-5 md:px-8 py-4 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={16} />
                          <span className="hidden sm:inline">Готово</span>
                        </button>
                        <button
                          onClick={() => updateStatus(app.id, 'cancelled_by_admin')}
                          className="flex-1 lg:flex-none bg-red-50 hover:bg-red-100 text-red-500 px-5 md:px-8 py-4 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle size={16} />
                          <span className="hidden sm:inline">Отмена</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-32 text-center bg-white rounded-[2.5rem] border border-zinc-100 border-dashed">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mx-auto mb-6">
                <Calendar size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-400 mb-2">Записей нет</h3>
              <p className="text-zinc-300 font-medium text-xs italic px-10">
                {activeFiltersCount > 0 || debouncedSearch ? 'Попробуйте сбросить фильтры' : 'Все визиты клиентов появятся здесь'}
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-6 py-3 rounded-2xl border border-zinc-100 bg-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:border-primary transition-all"
            >
              ← Назад
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${
                    p === page
                      ? 'bg-[#0A0A0A] text-white shadow-lg'
                      : 'bg-white border border-zinc-100 text-zinc-400 hover:border-primary'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-6 py-3 rounded-2xl border border-zinc-100 bg-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:border-primary transition-all"
            >
              Вперёд →
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
