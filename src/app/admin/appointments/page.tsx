'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, User, Phone,
  CheckCircle2, XCircle, Search, Filter, X, Send, Plus, RotateCcw, RefreshCw, CreditCard, Banknote, Trash2, Pencil, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminNewAppointmentModal from '@/components/admin/AdminNewAppointmentModal';

type AppointmentStatus = 'active' | 'pending_payment' | 'cancelled_by_client' | 'cancelled_by_admin' | 'completed';

interface AppointmentItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  totalPrice: number;
  prepaidAmount: number;
  paymentStatus: string;
  source: string | null;
  client: { name: string; phone: string; telegram_username?: string | null };
  services: { id: string; name: string; price: number; duration_minutes: number }[];
}

interface ServiceOption {
  id: string;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  active: 'Ожидается',
  pending_payment: 'Ожидает оплаты',
  completed: 'Завершено',
  cancelled_by_admin: 'Отменено вами',
  cancelled_by_client: 'Отменено клиентом',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  active: 'bg-blue-50 text-blue-600 border-blue-100',
  pending_payment: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  completed: 'bg-green-50 text-green-600 border-green-100',
  cancelled_by_admin: 'bg-red-50 text-red-600 border-red-100',
  cancelled_by_client: 'bg-red-50 text-red-600 border-red-100',
};

type DateFilter = 'all' | 'today' | 'week';
type StatusFilter = 'all' | AppointmentStatus;

const SOURCE_LABELS: Record<string, string> = {
  word_of_mouth: 'Сарафан',
  telegram: 'Telegram',
  vk: 'ВКонтакте',
  phone_call: 'Звонок',
  avito: 'Авито',
  other: 'Другое',
};

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
  const [showNewModal, setShowNewModal] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [detailApp, setDetailApp] = useState<AppointmentItem | null>(null);

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

  const checkPayment = async (appId: string) => {
    setChecking(appId);
    try {
      const res = await fetch('/api/payment/tinkoff/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: appId }),
      });
      const data = await res.json();
      if (data.result === 'paid') {
        setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status: 'active', paymentStatus: 'paid' } : a));
      } else if (data.result === 'failed') {
        setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status: 'cancelled_by_client', paymentStatus: 'failed' } : a));
      } else {
        alert('Оплата ещё не подтверждена Tinkoff');
      }
    } catch {
      alert('Ошибка соединения');
    }
    setChecking(null);
  };

  const refund = async (app: AppointmentItem) => {
    if (!confirm(`Вернуть ${app.prepaidAmount} ₽ клиенту ${app.client?.name}?`)) return;
    setRefunding(app.id);
    try {
      const res = await fetch('/api/payment/tinkoff/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: app.id }),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, paymentStatus: 'refunded' } : a));
      } else {
        alert(data.error ?? 'Ошибка возврата');
      }
    } catch {
      alert('Ошибка соединения');
    }
    setRefunding(null);
  };

  const deleteAppointment = async (app: AppointmentItem) => {
    if (!confirm(`Удалить запись ${app.client?.name} (${new Date(app.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})? Это действие необратимо.`)) return;
    try {
      const res = await fetch(`/api/admin/appointments?id=${app.id}`, { method: 'DELETE' });
      if (res.ok) setAppointments(prev => prev.filter(a => a.id !== app.id));
      else alert((await res.json()).error ?? 'Ошибка удаления');
    } catch {
      alert('Ошибка соединения');
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
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-primary/20 text-white"
          style={{ backgroundColor: '#D14D72' }}
        >
          <Plus size={16} />
          Новая запись
        </button>
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
                    {(['all', 'active', 'pending_payment', 'completed', 'cancelled_by_admin', 'cancelled_by_client'] as const).map(s => (
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
                  <div
                    className="flex gap-4 md:gap-8 items-start flex-1 cursor-pointer"
                    onClick={() => setDetailApp(app)}
                  >
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
                        {app.source && SOURCE_LABELS[app.source] && (
                          <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase border bg-zinc-50 text-zinc-400 border-zinc-100">
                            {SOURCE_LABELS[app.source]}
                          </span>
                        )}
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
                  </div>{/* end clickable left */}

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 lg:text-right border-t border-zinc-50 pt-6 lg:border-t-0 lg:pt-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">Услуги</div>
                      <div className="text-xs md:text-sm font-black text-[#0A0A0A] uppercase tracking-tight italic line-clamp-1">
                        {app.services?.map(s => s.name).join(', ')}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">Сумма</div>
                      <div className="text-2xl md:text-3xl font-black text-primary leading-none">{app.totalPrice} ₽</div>
                      {app.prepaidAmount > 0 && (
                        <div className="text-[9px] font-black uppercase tracking-widest text-green-500 mt-1">
                          ✓ {app.prepaidAmount} ₽ оплачено онлайн
                        </div>
                      )}
                      {app.prepaidAmount > 0 && app.prepaidAmount < app.totalPrice && (
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                          {app.totalPrice - app.prepaidAmount} ₽ при визите
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t lg:border-t-0 lg:border-l border-zinc-50 pt-6 lg:pt-0 lg:pl-10">
                    {app.status === 'pending_payment' && (
                      <button
                        onClick={() => checkPayment(app.id)}
                        disabled={checking === app.id}
                        className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 px-5 py-3 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {checking === app.id
                          ? <div className="w-4 h-4 border-2 border-yellow-300 border-t-yellow-600 rounded-full animate-spin" />
                          : <RefreshCw size={14} />
                        }
                        <span>Проверить оплату</span>
                      </button>
                    )}
                    {app.status === 'active' && (
                      <div className="flex gap-2">
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
                      </div>
                    )}
                    {app.prepaidAmount > 0 && app.paymentStatus === 'paid' && (
                      <button
                        onClick={() => refund(app)}
                        disabled={refunding === app.id}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-500 px-5 py-3 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {refunding === app.id
                          ? <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
                          : <RotateCcw size={14} />
                        }
                        <span>Вернуть {app.prepaidAmount} ₽</span>
                      </button>
                    )}
                    {app.paymentStatus === 'refunded' && (
                      <div className="px-4 py-2 rounded-xl bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">
                        ✓ Возврат выполнен
                      </div>
                    )}
                    {(app.status === 'cancelled_by_admin' || app.status === 'cancelled_by_client') && (
                      <button
                        onClick={() => deleteAppointment(app)}
                        className="bg-red-50 hover:bg-red-100 text-red-500 px-5 py-3 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} />
                        <span>Удалить</span>
                      </button>
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

      <AnimatePresence>
        {showNewModal && (
          <AdminNewAppointmentModal
            onClose={() => setShowNewModal(false)}
            onCreated={() => {
              setShowNewModal(false);
              fetchAppointments(page, statusFilter, dateFilter, debouncedSearch);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailApp && (
          <AppointmentDetailModal
            app={detailApp}
            onClose={() => setDetailApp(null)}
            onSaved={() => {
              setDetailApp(null);
              fetchAppointments(page, statusFilter, dateFilter, debouncedSearch);
            }}
            onDeleted={() => {
              setAppointments(prev => prev.filter(a => a.id !== detailApp.id));
              setDetailApp(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_required: 'Наличными при визите',
  pending: 'Ожидает оплаты',
  paid: 'Оплачено онлайн',
  failed: 'Ошибка оплаты',
  refunded: 'Возврат выполнен',
};

function toLocalKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMinsUI(t: string) {
  const [h, m] = t.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function AppointmentDetailModal({
  app, onClose, onSaved, onDeleted,
}: {
  app: AppointmentItem;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const [rescheduleMode, setRescheduleMode] = React.useState(false);
  const [workingDates, setWorkingDates] = React.useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [selectedTime, setSelectedTime] = React.useState<string>('');
  const [workingHours, setWorkingHours] = React.useState<{ start: string; end: string } | null>(null);
  const [occupiedIntervals, setOccupiedIntervals] = React.useState<{ start: string; end: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editServicesMode, setEditServicesMode] = React.useState(false);
  const [allServices, setAllServices] = React.useState<ServiceOption[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);
  const [loadingServicesEdit, setLoadingServicesEdit] = React.useState(false);
  const [savingServices, setSavingServices] = React.useState(false);

  const duration = toMinsUI(app.endTime) - toMinsUI(app.startTime);

  const dateFormatted = new Date(app.date + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', weekday: 'long',
  });

  React.useEffect(() => {
    if (!rescheduleMode) return;
    const today = toLocalKey(new Date());
    const to = toLocalKey(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
    fetch(`/api/schedule?from=${today}&to=${to}`)
      .then(r => r.json())
      .then((d: { date: string }[]) => setWorkingDates(new Set(Array.isArray(d) ? d.map(x => x.date) : [])));
  }, [rescheduleMode]);

  React.useEffect(() => {
    if (!selectedDate) return;
    setSelectedTime('');
    setLoadingSlots(true);
    fetch(`/api/availability?date=${selectedDate}&excludeId=${app.id}`)
      .then(r => r.json())
      .then(d => {
        setOccupiedIntervals(d.occupiedIntervals ?? []);
        setWorkingHours(d.workingHours ?? null);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, app.id]);

  const isSlotAvailable = (t: string) => {
    const start = toMinsUI(t);
    const end = start + duration;
    return !occupiedIntervals.some(iv => start < toMinsUI(iv.end) && end > toMinsUI(iv.start));
  };

  const timeSlots = React.useMemo(() => {
    if (!workingHours) return [];
    const slots: string[] = [];
    const [sh, sm] = workingHours.start.split(':').map(Number);
    const [eh, em] = workingHours.end.split(':').map(Number);
    for (let mins = sh * 60 + sm; mins + duration <= eh * 60 + em; mins += 30) {
      slots.push(`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`);
    }
    return slots;
  }, [workingHours, duration]);

  const handleDelete = async () => {
    if (!confirm(`Удалить запись ${app.client?.name}? Это действие необратимо.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/appointments?id=${app.id}`, { method: 'DELETE' });
      if (res.ok) onDeleted?.();
      else setError((await res.json()).error ?? 'Ошибка удаления');
    } catch {
      setError('Ошибка соединения');
    } finally {
      setDeleting(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) { setError('Выберите дату и время'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, action: 'reschedule', date: selectedDate, startTime: selectedTime.padEnd(8, ':00').substring(0, 8) }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Ошибка'); return; }
      onSaved?.();
    } catch {
      setError('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(() => {
    if (!editServicesMode) return;
    setSelectedServiceIds(app.services.map(s => s.id));
    setLoadingServicesEdit(true);
    fetch('/api/admin/services')
      .then(r => r.json())
      .then((data: ServiceOption[]) => setAllServices(Array.isArray(data) ? data.filter(s => s.is_active) : []))
      .finally(() => setLoadingServicesEdit(false));
  }, [editServicesMode, app.services]);

  const groupedServices = React.useMemo(() => {
    return allServices.reduce<Record<string, ServiceOption[]>>((acc, s) => {
      const cat = s.category || 'Прочее';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {});
  }, [allServices]);

  const newTotalPrice = React.useMemo(
    () => allServices.filter(s => selectedServiceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0),
    [allServices, selectedServiceIds]
  );
  const newTotalDuration = React.useMemo(
    () => allServices.filter(s => selectedServiceIds.includes(s.id)).reduce((sum, s) => sum + s.duration_minutes, 0),
    [allServices, selectedServiceIds]
  );

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSaveServices = async () => {
    if (!selectedServiceIds.length) { setError('Выберите хотя бы одну услугу'); return; }
    setSavingServices(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, action: 'update_services', serviceIds: selectedServiceIds }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Ошибка'); return; }
      onSaved?.();
    } catch {
      setError('Ошибка соединения');
    } finally {
      setSavingServices(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] cursor-pointer"
      />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[101] pointer-events-none p-4">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl pointer-events-auto overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-zinc-100">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-[#0A0A0A] leading-none">
                {app.client?.name || 'Без имени'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${STATUS_COLORS[app.status]}`}>
                  {STATUS_LABELS[app.status]}
                </span>
                {app.source && SOURCE_LABELS[app.source] && (
                  <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase border bg-zinc-50 text-zinc-400 border-zinc-100">
                    {SOURCE_LABELS[app.source]}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X size={18} className="text-zinc-500" />
            </button>
          </div>

          <div className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Client contacts */}
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">Контакты</div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`tel:${app.client?.phone}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-50 text-sm font-bold text-[#0A0A0A] hover:bg-primary/5 transition-colors"
                >
                  <Phone size={14} style={{ color: '#D14D72' }} />
                  {app.client?.phone || '—'}
                </a>
                {app.client?.telegram_username && (
                  <a
                    href={`https://t.me/${app.client.telegram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#2AABEE]/10 text-sm font-bold text-[#2AABEE] hover:bg-[#2AABEE]/20 transition-colors"
                  >
                    <Send size={14} />
                    @{app.client.telegram_username}
                  </a>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">Дата и время</div>
              <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-zinc-50">
                <Calendar size={18} style={{ color: '#D14D72' }} />
                <span className="font-black text-[#0A0A0A] uppercase tracking-tight">{dateFormatted}</span>
                <span className="text-zinc-300">·</span>
                <Clock size={18} style={{ color: '#D14D72' }} />
                <span className="font-black text-[#0A0A0A]">{app.startTime.substring(0, 5)} — {app.endTime.substring(0, 5)}</span>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">
                Услуги ({app.services?.length ?? 0})
              </div>
              <div className="space-y-2">
                {app.services?.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-zinc-50">
                    <span className="text-base">💅</span>
                    <span className="font-bold text-sm text-[#0A0A0A] uppercase tracking-tight">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">Оплата</div>
              <div className="px-5 py-4 rounded-2xl bg-zinc-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-500">
                    {app.paymentStatus === 'not_required' ? <Banknote size={16} /> : <CreditCard size={16} />}
                    {PAYMENT_STATUS_LABELS[app.paymentStatus] ?? app.paymentStatus}
                  </div>
                  <div className="text-2xl font-black text-[#0A0A0A]">{app.totalPrice} ₽</div>
                </div>
                {app.prepaidAmount > 0 && (
                  <div className="border-t border-zinc-200 pt-3 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-green-600">✓ Оплачено онлайн</span>
                      <span className="text-green-600">{app.prepaidAmount} ₽</span>
                    </div>
                    {app.prepaidAmount < app.totalPrice && (
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-zinc-400">При визите</span>
                        <span className="text-zinc-400">{app.totalPrice - app.prepaidAmount} ₽</span>
                      </div>
                    )}
                    {app.paymentStatus === 'refunded' && (
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-orange-500">↩ Возврат выполнен</span>
                        <span className="text-orange-500">{app.prepaidAmount} ₽</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Edit services panel — inside scroll area so buttons are always reachable */}
            {editServicesMode && (
              <div className="border-t border-zinc-100 -mx-8 px-8 pt-5 space-y-4">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Изменить услуги</div>

                {loadingServicesEdit ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-100 animate-spin" style={{ borderTopColor: '#D14D72' }} />
                  </div>
                ) : (
                  <>
                    {Object.entries(groupedServices).map(([category, services]) => (
                      <div key={category}>
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-2">{category}</div>
                        <div className="space-y-1.5">
                          {services.map(service => {
                            const isSelected = selectedServiceIds.includes(service.id);
                            return (
                              <button
                                key={service.id}
                                onClick={() => toggleService(service.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left"
                                style={{
                                  backgroundColor: isSelected ? '#FFF0F4' : '#FAFAFA',
                                  borderColor: isSelected ? '#D14D72' : '#F4F4F5',
                                }}
                              >
                                <div
                                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                                  style={{
                                    borderColor: isSelected ? '#D14D72' : '#D4D4D8',
                                    backgroundColor: isSelected ? '#D14D72' : 'transparent',
                                  }}
                                >
                                  {isSelected && <Check size={11} color="white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-bold text-[#0A0A0A] uppercase tracking-tight truncate">{service.name}</div>
                                  <div className="text-[10px] text-zinc-400 font-medium">{service.duration_minutes} мин</div>
                                </div>
                                <div className="text-sm font-black flex-shrink-0" style={{ color: '#D14D72' }}>{service.price} ₽</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="px-5 py-4 rounded-2xl bg-zinc-50 flex items-center justify-between">
                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                        {selectedServiceIds.length} услуг · {newTotalDuration} мин
                      </div>
                      <div className="text-xl font-black" style={{ color: '#D14D72' }}>{newTotalPrice} ₽</div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-2 pb-2">
                  <button
                    onClick={() => { setEditServicesMode(false); setError(null); }}
                    className="py-4 rounded-2xl bg-zinc-100 text-[#0A0A0A] font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveServices}
                    disabled={savingServices || !selectedServiceIds.length}
                    className="py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-60"
                    style={{ backgroundColor: '#D14D72' }}
                  >
                    {savingServices ? '...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            )}

            {/* Reschedule panel — inside scroll area so it's always reachable */}
            {rescheduleMode && (
              <div className="border-t border-zinc-100 -mx-8 px-8 pt-5 space-y-4">
                {/* Calendar */}
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Выберите новую дату</div>
                  {workingDates.size === 0 ? (
                    <div className="flex justify-center py-3">
                      <div className="w-5 h-5 rounded-full border-2 border-zinc-100 animate-spin" style={{ borderTopColor: '#D14D72' }} />
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-3 -mx-2 px-2 no-scrollbar">
                      {Array.from({ length: 60 }, (_, i) => {
                        const d = new Date(); d.setDate(d.getDate() + i);
                        const key = toLocalKey(d);
                        const isWorking = workingDates.has(key);
                        const isSel = selectedDate === key;
                        return (
                          <button
                            key={key}
                            disabled={!isWorking}
                            onClick={() => { setSelectedDate(key); setSelectedTime(''); }}
                            className="min-w-[58px] flex flex-col items-center justify-center py-3 rounded-2xl border transition-all flex-shrink-0"
                            style={{
                              backgroundColor: isSel ? '#D14D72' : isWorking ? 'white' : '#F4F4F5',
                              borderColor: isSel ? '#D14D72' : isWorking ? '#E4E4E7' : '#F4F4F5',
                              color: isSel ? 'white' : isWorking ? '#0A0A0A' : '#C4C4C8',
                              opacity: isWorking || isSel ? 1 : 0.4,
                              boxShadow: isSel ? '0 6px 20px rgba(209,77,114,0.25)' : 'none',
                              cursor: isWorking ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: isSel ? 'rgba(255,255,255,0.7)' : '#A1A1AA' }}>
                              {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
                            </span>
                            <span className="text-lg font-black leading-none mt-0.5">{d.getDate()}</span>
                            <span className="text-[9px] font-bold" style={{ color: isSel ? 'rgba(255,255,255,0.7)' : '#A1A1AA' }}>
                              {d.toLocaleDateString('ru-RU', { month: 'short' })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">Свободное время</div>
                    {loadingSlots ? (
                      <div className="flex justify-center py-4">
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-100 animate-spin" style={{ borderTopColor: '#D14D72' }} />
                      </div>
                    ) : workingHours === null ? (
                      <div className="py-4 text-center rounded-2xl bg-zinc-50 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                        Нерабочий день
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <div className="py-4 text-center rounded-2xl bg-zinc-50 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                        Нет свободных слотов
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlots.map(t => {
                          const avail = isSlotAvailable(t);
                          const sel = selectedTime === t;
                          return (
                            <button
                              key={t}
                              disabled={!avail}
                              onClick={() => setSelectedTime(t)}
                              className="py-3 rounded-xl font-black text-xs border transition-all"
                              style={{
                                backgroundColor: sel ? '#D14D72' : avail ? 'white' : '#F9F9F9',
                                borderColor: sel ? '#D14D72' : avail ? '#E4E4E7' : '#F4F4F5',
                                color: sel ? 'white' : avail ? '#0A0A0A' : '#D4D4D8',
                                opacity: avail || sel ? 1 : 0.5,
                                cursor: avail ? 'pointer' : 'not-allowed',
                                boxShadow: sel ? '0 4px 12px rgba(209,77,114,0.25)' : 'none',
                              }}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold">{error}</div>
                )}

                {/* Reschedule action buttons */}
                <div className="grid grid-cols-2 gap-2 pb-2">
                  <button
                    onClick={() => { setRescheduleMode(false); setError(null); }}
                    className="py-4 rounded-2xl bg-zinc-100 text-[#0A0A0A] font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={saving}
                    className="py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-60"
                    style={{ backgroundColor: '#D14D72' }}
                  >
                    {saving ? '...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fixed footer — only shown when not in any editing mode */}
          {!rescheduleMode && !editServicesMode && (
            <div className="px-8 pb-8 pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onClose}
                  className="py-4 rounded-2xl bg-zinc-100 text-[#0A0A0A] font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
                >
                  Закрыть
                </button>
                <button
                  onClick={() => setRescheduleMode(true)}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2"
                  style={{ borderColor: '#D14D72', color: '#D14D72' }}
                >
                  <RefreshCw size={13} />
                  Перенести
                </button>
              </div>
              <button
                onClick={() => setEditServicesMode(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 text-[#0A0A0A] font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <Pencil size={13} />
                Изменить услуги
              </button>
              {(app.status === 'cancelled_by_admin' || app.status === 'cancelled_by_client') && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {deleting
                    ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                    : <Trash2 size={13} />
                  }
                  Удалить запись
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
