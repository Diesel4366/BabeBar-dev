'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, User, Phone,
  CheckCircle2, XCircle, ChevronLeft, Search, Filter, X, Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

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

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/appointments');
      const data = await res.json();
      if (Array.isArray(data)) setAppointments(data);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

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

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const filtered = appointments.filter(app => {
    if (searchTerm && !app.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !app.client?.phone?.includes(searchTerm)) return false;
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (dateFilter === 'today' && app.date !== today) return false;
    if (dateFilter === 'week' && app.date < weekAgo) return false;
    return true;
  });

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (dateFilter !== 'all' ? 1 : 0);

  return (
    <div className="bg-[#FAFAFA] min-h-screen pt-24 pb-12">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-100 rounded-full hover:bg-zinc-50 transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-[#0A0A0A] mb-2 tracking-tight uppercase">Записи</h1>
              <p className="text-zinc-500 font-medium text-sm">{filtered.length} из {appointments.length}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 mb-10">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
              <input
                type="text"
                placeholder="Поиск по имени или телефону..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white pl-16 pr-8 py-5 rounded-2xl border border-zinc-100 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-sm outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`bg-white border px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-colors relative ${
                showFilters || activeFiltersCount > 0 ? 'border-primary text-primary' : 'border-zinc-100 hover:bg-zinc-50'
              }`}
            >
              <Filter size={16} />
              Фильтры
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
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
                <div className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-5">
                  {/* Status filter */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Статус</div>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'active', 'completed', 'cancelled_by_admin', 'cancelled_by_client'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                            statusFilter === s ? 'bg-[#0A0A0A] text-white' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                          }`}
                        >
                          {s === 'all' ? 'Все' : STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date filter */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Период</div>
                    <div className="flex gap-2">
                      {([['all', 'Все'], ['today', 'Сегодня'], ['week', 'Эта неделя']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setDateFilter(val)}
                          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                            dateFilter === val ? 'bg-[#0A0A0A] text-white' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => { setStatusFilter('all'); setDateFilter('all'); }}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                      Сбросить фильтры
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
          <div className="grid grid-cols-1 gap-6">
            {filtered.length > 0 ? (
              filtered.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-[2rem] border border-zinc-100 p-8 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                    <div className="flex gap-6 items-start">
                      <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 flex-shrink-0">
                        <User size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-black uppercase tracking-tight">{app.client?.name || 'Без имени'}</h3>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${STATUS_COLORS[app.status]}`}>
                            {STATUS_LABELS[app.status]}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-400">
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-primary" />
                            <span>{app.client?.phone || '—'}</span>
                          </div>
                          {app.client?.telegram_username && (
                            <a
                              href={`https://t.me/${app.client.telegram_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 transition-opacity hover:opacity-70"
                              style={{ color: '#2AABEE' }}
                            >
                              <Send size={13} />
                              @{app.client.telegram_username}
                            </a>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-primary" />
                            <span>{new Date(app.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-primary" />
                            <span>{app.startTime} — {app.endTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-8 lg:text-right">
                      <div className="flex-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-2">Услуги</div>
                        <div className="text-sm font-bold text-[#0A0A0A]">
                          {app.services?.map(s => s.name).join(', ')}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-2">Сумма</div>
                        <div className="text-2xl font-black text-primary">{app.totalPrice} ₽</div>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t lg:border-t-0 lg:border-l border-zinc-50 pt-6 lg:pt-0 lg:pl-8">
                      {app.status === 'active' && (
                        <>
                          <button
                            onClick={() => updateStatus(app.id, 'completed')}
                            className="flex-1 lg:flex-none bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={16} />
                            Готово
                          </button>
                          <button
                            onClick={() => updateStatus(app.id, 'cancelled_by_admin')}
                            className="flex-1 lg:flex-none bg-red-50 hover:bg-red-100 text-red-500 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                          >
                            <XCircle size={16} />
                            Отмена
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-32 text-center bg-white rounded-[3rem] border border-zinc-100">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mx-auto mb-6">
                  <Calendar size={40} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-zinc-400 mb-2">Записей нет</h3>
                <p className="text-zinc-300 font-medium text-sm">
                  {activeFiltersCount > 0 || searchTerm ? 'Попробуйте изменить фильтры' : 'Все новые записи будут появляться здесь'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
