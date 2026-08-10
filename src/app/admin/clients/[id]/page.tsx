import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ArrowLeft, Phone, Send, Calendar, Cake, Wallet, Receipt, TrendingUp, Clock, Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ServiceRef {
  id: string;
  name: string;
}

interface AppointmentRow {
  id: string;
  date: string;
  startTime: string;
  status: string;
  totalPrice: number;
  services: ServiceRef[];
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

async function getClientData(id: string) {
  const [{ data: client }, { data: appointments }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, name, phone, nickname, telegram_username, telegram_id, vk_id, created_at, birthday')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('appointments')
      .select('id, date, start_time, status, total_price, appointment_services ( services ( id, name ) )')
      .eq('client_id', id)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false }),
  ]);

  if (!client) return null;

  const formatted: AppointmentRow[] = (appointments ?? []).map(a => ({
    id: a.id,
    date: a.date,
    startTime: a.start_time,
    status: a.status,
    totalPrice: a.total_price,
    services: (a.appointment_services as unknown as { services: ServiceRef | null }[])
      .map(s => s.services)
      .filter((s): s is ServiceRef => s !== null),
  }));

  return { client, appointments: formatted };
}

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClientData(id);
  if (!data) notFound();
  const { client, appointments } = data;

  const completed = appointments.filter(a => a.status === 'completed');
  const totalSpent = completed.reduce((sum, a) => sum + (a.totalPrice || 0), 0);
  const totalVisits = completed.length;
  const avgCheck = totalVisits > 0 ? totalSpent / totalVisits : 0;
  const firstVisit = completed.length > 0 ? completed[completed.length - 1].date : null;
  const lastVisit = completed.length > 0 ? completed[0].date : null;

  const serviceCounts = new Map<string, { name: string; count: number }>();
  for (const a of completed) {
    for (const s of a.services) {
      const entry = serviceCounts.get(s.id) ?? { name: s.name, count: 0 };
      entry.count += 1;
      serviceCounts.set(s.id, entry);
    }
  }
  const favoriteService = Array.from(serviceCounts.values()).sort((a, b) => b.count - a.count)[0] ?? null;

  return (
    <div className="space-y-10">
      <Link href="/admin/clients" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors">
        <ArrowLeft size={14} /> Все клиенты
      </Link>

      {/* Шапка клиента */}
      <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 md:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
            {client.name || 'Без имени'}
          </h1>
          {client.nickname && (
            <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: '#D14D72' }}>
              {client.nickname}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-6 text-xs font-bold text-zinc-400">
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-primary" />
            <span className="text-[#0A0A0A]">{client.phone || '—'}</span>
          </div>
          {client.telegram_username && (
            <a href={`https://t.me/${client.telegram_username}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#2AABEE] hover:scale-105 transition-all">
              <Send size={13} />
              @{client.telegram_username}
            </a>
          )}
          {client.vk_id && (
            <a href={`https://vk.com/id${client.vk_id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 hover:scale-105 transition-all" style={{ color: '#0077FF' }}>
              VK
            </a>
          )}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-primary" />
            <span>Регистрация: {format(new Date(client.created_at), 'd MMMM yyyy', { locale: ru })}</span>
          </div>
          {client.birthday && (
            <div className="flex items-center gap-2">
              <Cake size={14} className="text-primary" />
              <span>ДР: {format(new Date(client.birthday + 'T12:00:00'), 'd MMMM', { locale: ru })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Сводные карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <div className="p-3 rounded-2xl bg-pink-50 text-primary w-fit mb-6"><Wallet size={22} /></div>
          <div className="text-3xl font-black tracking-tighter mb-1">{fmt(totalSpent)} ₽</div>
          <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">LTV — всего потрачено</div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-500 w-fit mb-6"><Receipt size={22} /></div>
          <div className="text-3xl font-black tracking-tighter mb-1">{totalVisits}</div>
          <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Завершённых визитов</div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-500 w-fit mb-6"><TrendingUp size={22} /></div>
          <div className="text-3xl font-black tracking-tighter mb-1">{fmt(avgCheck)} ₽</div>
          <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Средний чек</div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <div className="p-3 rounded-2xl bg-green-50 text-green-500 w-fit mb-6"><Clock size={22} /></div>
          <div className="text-xl font-black tracking-tighter mb-1">
            {lastVisit ? format(new Date(lastVisit), 'd MMM yyyy', { locale: ru }) : '—'}
          </div>
          <div className="text-zinc-400 text-[9px] font-black uppercase tracking-widest">Последний визит</div>
        </div>
      </div>

      {(firstVisit || favoriteService) && (
        <div className="flex flex-wrap gap-6 px-2 text-[11px] font-bold text-zinc-500">
          {firstVisit && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-zinc-300" />
              Первый визит: <span className="text-[#0A0A0A] font-black">{format(new Date(firstVisit), 'd MMMM yyyy', { locale: ru })}</span>
            </div>
          )}
          {favoriteService && (
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-primary" />
              Любимая услуга: <span className="text-[#0A0A0A] font-black">{favoriteService.name}</span> ({favoriteService.count}×)
            </div>
          )}
        </div>
      )}

      {/* История визитов */}
      <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm">
        <div className="px-10 py-6 border-b border-zinc-100">
          <h2 className="text-sm font-black uppercase tracking-widest">История визитов</h2>
        </div>
        {appointments.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Дата</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Услуги</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Статус</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {appointments.map(a => {
                const st = STATUS_LABELS[a.status] ?? { label: a.status, className: 'bg-zinc-100 text-zinc-400' };
                return (
                  <tr key={a.id} className="hover:bg-zinc-50/30 transition-colors">
                    <td className="px-10 py-6">
                      <div className="font-black text-sm uppercase tracking-tight">
                        {format(new Date(a.date), 'd MMM yyyy', { locale: ru })}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-bold uppercase mt-1">{a.startTime?.slice(0, 5)}</div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="text-xs font-medium text-zinc-500 italic">
                        {a.services.map(s => s.name).join(', ') || 'Без услуг'}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right font-black text-sm">{fmt(a.totalPrice)} ₽</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-20 text-center text-zinc-400 font-bold text-sm uppercase tracking-widest">
            У клиента пока нет записей
          </div>
        )}
      </div>
    </div>
  );
}
