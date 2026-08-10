'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Users, Receipt, Wallet, Loader2, Search, Phone, Calendar, Send
} from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Service } from '@/types';

type RangeMode = 'today' | 'week' | 'month' | 'year' | 'custom';

interface ServiceBreakdown {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

interface OverviewData {
  totalRevenue: number;
  totalAppointments: number;
  uniqueClients: number;
  avgCheck: number;
  services: ServiceBreakdown[];
}

interface ServiceHistoryRow {
  id: string;
  date: string;
  startTime: string;
  status: string;
  totalPrice: number;
  clientId: string | null;
  client: { name: string | null; phone: string | null; telegram_username: string | null } | null;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  completed: { label: 'Завершено', className: 'bg-green-50 text-green-600' },
  active: { label: 'Активна', className: 'bg-blue-50 text-blue-600' },
  pending_payment: { label: 'Ждёт оплаты', className: 'bg-amber-50 text-amber-600' },
  cancelled_by_client: { label: 'Отменена клиентом', className: 'bg-zinc-100 text-zinc-400' },
  cancelled_by_admin: { label: 'Отменена админом', className: 'bg-zinc-100 text-zinc-400' },
};

function fmt(n: number) {
  return Math.round(n).toLocaleString('ru-RU');
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function ReportsPage() {
  const [rangeMode, setRangeMode] = useState<RangeMode>('month');
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());
  const [tab, setTab] = useState<'overview' | 'service'>('overview');

  const { from, to } = useMemo(() => {
    const now = new Date();
    const to = todayStr();
    if (rangeMode === 'custom') return { from: customFrom, to: customTo };
    if (rangeMode === 'today') return { from: to, to };
    if (rangeMode === 'week') return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to };
    if (rangeMode === 'month') return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to };
    return { from: format(startOfYear(now), 'yyyy-MM-dd'), to };
  }, [rangeMode, customFrom, customTo]);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceRows, setServiceRows] = useState<ServiceHistoryRow[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    if (from > to) return;
    setOverviewLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/overview?from=${from}&to=${to}`);
      if (res.ok) setOverview(await res.json());
    } finally {
      setOverviewLoading(false);
    }
  }, [from, to]);

  const fetchServiceHistory = useCallback(async () => {
    if (!selectedServiceId || from > to) { setServiceRows([]); return; }
    setServiceLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/service?serviceId=${selectedServiceId}&from=${from}&to=${to}`);
      if (res.ok) setServiceRows(await res.json());
    } finally {
      setServiceLoading(false);
    }
  }, [selectedServiceId, from, to]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { fetchServiceHistory(); }, [fetchServiceHistory]);

  useEffect(() => {
    fetch('/api/admin/services').then(r => r.ok ? r.json() : []).then(setServices);
  }, []);

  const serviceSummary = useMemo(() => {
    const completed = serviceRows.filter(r => r.status === 'completed');
    const revenue = completed.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const uniqueClients = new Set(completed.map(r => r.clientId).filter(Boolean)).size;
    return { revenue, visits: completed.length, uniqueClients, avgCheck: completed.length > 0 ? revenue / completed.length : 0 };
  }, [serviceRows]);

  const rangeLabel = `${format(new Date(from), 'd MMM yyyy', { locale: ru })} — ${format(new Date(to), 'd MMM yyyy', { locale: ru })}`;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4">
          Отчёты <span className="text-primary italic">и статистика</span>
        </h1>
        <p className="text-zinc-400 font-medium uppercase text-[10px] tracking-[0.2em]">
          {rangeLabel}
        </p>
      </div>

      {/* Период */}
      <div className="bg-white rounded-[2rem] border border-zinc-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex flex-wrap gap-2">
          {([
            ['today', 'Сегодня'],
            ['week', 'Неделя'],
            ['month', 'Месяц'],
            ['year', 'Год'],
            ['custom', 'Свой период'],
          ] as [RangeMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setRangeMode(mode)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                rangeMode === mode ? 'bg-[#0A0A0A] text-white' : 'bg-zinc-50 text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {rangeMode === 'custom' && (
          <div className="flex items-center gap-3">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="bg-zinc-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20" />
            <span className="text-zinc-300 text-xs font-black">—</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="bg-zinc-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20" />
          </div>
        )}
      </div>

      {/* Вкладки */}
      <div className="inline-flex gap-1 bg-white border border-zinc-100 rounded-2xl p-1.5 shadow-sm">
        <button
          onClick={() => setTab('overview')}
          className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            tab === 'overview' ? 'bg-[#0A0A0A] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          Общая статистика
        </button>
        <button
          onClick={() => setTab('service')}
          className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
            tab === 'service' ? 'bg-[#0A0A0A] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          По услуге
        </button>
      </div>

      {tab === 'overview' ? (
        <div className="space-y-8">
          {/* Карточки */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="p-3 rounded-2xl bg-pink-50 text-primary w-fit mb-6"><Wallet size={22} /></div>
              <div className="text-3xl font-black tracking-tighter mb-1">{fmt(overview?.totalRevenue ?? 0)} ₽</div>
              <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Выручка</div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-500 w-fit mb-6"><Receipt size={22} /></div>
              <div className="text-3xl font-black tracking-tighter mb-1">{overview?.totalAppointments ?? 0}</div>
              <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Завершённых визитов</div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="p-3 rounded-2xl bg-green-50 text-green-500 w-fit mb-6"><Users size={22} /></div>
              <div className="text-3xl font-black tracking-tighter mb-1">{overview?.uniqueClients ?? 0}</div>
              <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Уникальных клиентов</div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-500 w-fit mb-6"><TrendingUp size={22} /></div>
              <div className="text-3xl font-black tracking-tighter mb-1">{fmt(overview?.avgCheck ?? 0)} ₽</div>
              <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Средний чек</div>
            </div>
          </div>

          {/* Разбивка по услугам */}
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm">
            <div className="px-10 py-6 border-b border-zinc-100">
              <h2 className="text-sm font-black uppercase tracking-widest">Услуги за период</h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Выручка — оценка по текущему прайсу услуги</p>
            </div>
            {overviewLoading ? (
              <div className="py-20 flex justify-center"><Loader2 size={24} className="animate-spin text-zinc-300" /></div>
            ) : (overview?.services.length ?? 0) > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-100">
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Услуга</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Кол-во</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Выручка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {overview!.services.map(s => (
                    <tr key={s.id} className="hover:bg-zinc-50/30 transition-colors">
                      <td className="px-10 py-5 font-bold text-sm">{s.name}</td>
                      <td className="px-10 py-5 text-right font-bold text-sm text-zinc-500">{s.count}</td>
                      <td className="px-10 py-5 text-right font-black text-sm">{fmt(s.revenue)} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-20 text-center text-zinc-400 font-bold text-sm uppercase tracking-widest">
                Нет завершённых визитов за период
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-zinc-100 p-6 shadow-sm">
            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Услуга</label>
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl py-3 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-[#D14D72]/20 appearance-none"
              >
                <option value="">— выберите услугу —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
              </select>
            </div>
          </div>

          {selectedServiceId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
                <div className="p-3 rounded-2xl bg-pink-50 text-primary w-fit mb-6"><Wallet size={22} /></div>
                <div className="text-3xl font-black tracking-tighter mb-1">{fmt(serviceSummary.revenue)} ₽</div>
                <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Выручка</div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-500 w-fit mb-6"><Receipt size={22} /></div>
                <div className="text-3xl font-black tracking-tighter mb-1">{serviceSummary.visits}</div>
                <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Завершённых визитов</div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
                <div className="p-3 rounded-2xl bg-green-50 text-green-500 w-fit mb-6"><Users size={22} /></div>
                <div className="text-3xl font-black tracking-tighter mb-1">{serviceSummary.uniqueClients}</div>
                <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Уникальных клиентов</div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-500 w-fit mb-6"><TrendingUp size={22} /></div>
                <div className="text-3xl font-black tracking-tighter mb-1">{fmt(serviceSummary.avgCheck)} ₽</div>
                <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Средний чек</div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm">
            {!selectedServiceId ? (
              <div className="py-20 text-center text-zinc-400 font-bold text-sm uppercase tracking-widest">
                Выберите услугу, чтобы увидеть историю записей
              </div>
            ) : serviceLoading ? (
              <div className="py-20 flex justify-center"><Loader2 size={24} className="animate-spin text-zinc-300" /></div>
            ) : serviceRows.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-100">
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Дата</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Клиент</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Статус</th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {serviceRows.map(row => {
                    const st = STATUS_LABELS[row.status] ?? { label: row.status, className: 'bg-zinc-100 text-zinc-400' };
                    return (
                      <tr key={row.id} className="hover:bg-zinc-50/30 transition-colors">
                        <td className="px-10 py-6">
                          <div className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                            <Calendar size={13} className="text-zinc-300" />
                            {format(new Date(row.date), 'd MMM yyyy', { locale: ru })}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-bold uppercase mt-1">{row.startTime?.slice(0, 5)}</div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="font-bold text-sm">{row.client?.name || '—'}</div>
                          {row.client?.phone && (
                            <div className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 mt-1">
                              <Phone size={11} /> {row.client.phone}
                            </div>
                          )}
                          {row.client?.telegram_username && (
                            <div className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 mt-1">
                              <Send size={11} /> @{row.client.telegram_username}
                            </div>
                          )}
                        </td>
                        <td className="px-10 py-6">
                          <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${st.className}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right font-black text-sm">{fmt(row.totalPrice)} ₽</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-20 text-center text-zinc-400 font-bold text-sm uppercase tracking-widest">
                Нет записей на эту услугу за выбранный период
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
