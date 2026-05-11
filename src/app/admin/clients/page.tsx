import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Users, Phone, Calendar, Send, Cake } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

async function getClientsData() {
  try {
    // Получаем всех клиентов и их записи
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        name,
        phone,
        telegram_username,
        created_at,
        birthday,
        appointments (
          id,
          total_price,
          status,
          date
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Агрегируем данные
    return (profiles || []).map(p => {
      const completed = (p.appointments as any[] || []).filter(a => a.status === 'completed');
      const totalSpent = completed.reduce((sum, a) => sum + (a.total_price || 0), 0);
      const lastVisit = completed.length > 0 
        ? completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null;

      return {
        ...p,
        totalVisits: completed.length,
        totalSpent,
        lastVisit
      };
    });
  } catch (error) {
    console.error('Clients data error:', error);
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function AdminClients() {
  const clients = await getClientsData();

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">
          База <span className="text-primary italic">клиентов</span>
        </h1>
        <p className="text-zinc-400 font-medium uppercase text-[10px] tracking-[0.2em]">
          Всего {clients.length} уникальных пользователей
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {clients.length > 0 ? (
          clients.map((client) => (
            <div key={client.id} className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 hover:shadow-xl transition-all duration-500 group">
              <div className="flex gap-8 items-center">
                <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                  <Users size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-[#0A0A0A] mb-3">{client.name || 'Без имени'}</h3>
                  <div className="flex flex-wrap gap-6 text-xs font-bold text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-primary" />
                      <span className="text-[#0A0A0A]">{client.phone || '—'}</span>
                    </div>
                    {client.telegram_username && (
                      <a
                        href={`https://t.me/${client.telegram_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#2AABEE] hover:scale-105 transition-all"
                      >
                        <Send size={13} />
                        @{client.telegram_username}
                      </a>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      <span>Регистрация: {format(new Date(client.created_at), 'd MMMM yyyy', { locale: ru })}</span>
                    </div>
                    {(client as any).birthday && (
                      <div className="flex items-center gap-2">
                        <Cake size={14} className="text-primary" />
                        <span>ДР: {format(new Date((client as any).birthday + 'T12:00:00'), 'd MMMM', { locale: ru })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-12 lg:text-right">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">Визитов</div>
                  <div className="text-2xl font-black text-[#0A0A0A]">{client.totalVisits}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">LTV (Выручка)</div>
                  <div className="text-2xl font-black text-primary">{client.totalSpent} ₽</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">Последний раз</div>
                  <div className="text-sm font-black text-[#0A0A0A] uppercase tracking-tighter">
                    {client.lastVisit ? format(new Date(client.lastVisit), 'd MMM yyyy', { locale: ru }) : 'Нет визитов'}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-40 text-center bg-white rounded-[3rem] border border-zinc-100 border-dashed">
            <p className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.3em]">Список клиентов пуст</p>
          </div>
        )}
      </div>
    </div>
  );
}
