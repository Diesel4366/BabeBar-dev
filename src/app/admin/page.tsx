import React from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  Plus, 
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Scissors
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { format, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

async function getDashboardData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = startOfMonth(new Date()).toISOString();

    const [todayRes, monthClientsRes, revenueRes, upcomingRes] = await Promise.all([
      // Записи сегодня
      supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .in('status', ['active', 'completed']),
      
      // Клиенты за месяц (для сегментации)
      supabaseAdmin
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', monthStart),

      // Выручка
      supabaseAdmin
        .from('appointments')
        .select('total_price')
        .gte('date', today.substring(0, 7) + '-01')
        .eq('status', 'completed'),

      // Ближайшие записи
      supabaseAdmin
        .from('appointments')
        .select(`
          id, 
          start_time, 
          end_time, 
          status,
          total_price,
          profiles (name, telegram_username, phone),
          appointment_services (services (name))
        `)
        .eq('date', today)
        .order('start_time', { ascending: true })
        .limit(5)
    ]);

    const monthRevenue = revenueRes.data?.reduce((sum, a) => sum + (a.total_price || 0), 0) ?? 0;
    
    // Сегментация клиентов
    const newClientsCount = monthClientsRes.data?.length ?? 0;
    
    // Для "вернувшихся" нужно посчитать тех, кто записался в этом месяце, но был создан раньше
    const { data: returningClients } = await supabaseAdmin
      .from('appointments')
      .select('client_id')
      .gte('date', today.substring(0, 7) + '-01')
      .not('client_id', 'is', null);
    
    const uniqueClientIds = Array.from(new Set(returningClients?.map(a => a.client_id)));
    // Упрощенно: если ID клиента нет в списке созданных в этом месяце — он вернувшийся
    const createdThisMonthIds = new Set(monthClientsRes.data?.map(c => c.id));
    const returningCount = uniqueClientIds.filter(id => !createdThisMonthIds.has(id)).length;

    return {
      todayAppointments: todayRes.count ?? 0,
      newClients: newClientsCount,
      returningClients: returningCount,
      monthRevenue,
      upcoming: upcomingRes.data as any[] || []
    };
  } catch (error) {
    console.error('Dashboard data error:', error);
    return { todayAppointments: 0, newClients: 0, returningClients: 0, monthRevenue: 0, upcoming: [] };
  }
}

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const data = await getDashboardData();

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">
            Обзор <span className="text-primary italic">бизнеса</span>
          </h1>
          <p className="text-zinc-400 font-medium uppercase text-[10px] tracking-[0.2em]">
            Статистика и управление на сегодня
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/appointments" className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white border border-zinc-100 text-[10px] font-black uppercase tracking-widest hover:border-primary transition-all">
            <Plus size={16} className="text-primary" />
            Записать клиента
          </Link>
          <Link href="/admin/services" className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#0A0A0A] text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">
            <Scissors size={16} />
            Каталог услуг
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:border-primary transition-all duration-500">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-500 group-hover:bg-primary group-hover:text-white transition-all duration-500">
              <Calendar size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Сегодня</span>
          </div>
          <div className="text-5xl font-black mb-2 tracking-tighter">{data.todayAppointments}</div>
          <div className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Записей подтверждено</div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:border-primary transition-all duration-500">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-green-50 text-green-500 group-hover:bg-primary group-hover:text-white transition-all duration-500">
              <Users size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Клиенты</span>
          </div>
          <div className="text-5xl font-black mb-2 tracking-tighter">{data.newClients + data.returningClients}</div>
          <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
            <span className="text-green-500">{data.newClients} Новых</span>
            <span className="text-blue-500">{data.returningClients} Вернулись</span>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:border-primary transition-all duration-500">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 rounded-2xl bg-pink-50 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
              <TrendingUp size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Месяц</span>
          </div>
          <div className="text-5xl font-black mb-2 tracking-tighter">{data.monthRevenue.toLocaleString('ru-RU')} ₽</div>
          <div className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Выручка (завершенные)</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-xl font-black uppercase tracking-tight">Ближайшие записи</h2>
            <Link href="/admin/appointments" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors flex items-center gap-1">
              Все записи <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {data.upcoming.length > 0 ? (
              data.upcoming.map((appt) => (
                <div key={appt.id} className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center justify-between hover:shadow-md transition-all">
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-black leading-none">{appt.start_time.substring(0, 5)}</div>
                      <div className="text-[10px] text-zinc-400 font-bold uppercase">{appt.end_time.substring(0, 5)}</div>
                    </div>
                    <div className="h-10 w-[1px] bg-zinc-100" />
                    <div>
                      <div className="font-black text-sm uppercase tracking-tight">{appt.profiles?.name || 'Клиент'}</div>
                      <div className="text-[10px] text-zinc-400 font-medium">{appt.appointment_services?.[0]?.services?.name || 'Услуга'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                      <div className="font-black text-sm">{appt.total_price} ₽</div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest ${appt.status === 'active' ? 'text-green-500' : 'text-zinc-400'}`}>
                        {appt.status === 'active' ? 'Активна' : 'Завершена'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-red-500 transition-colors">
                        <XCircle size={18} />
                      </button>
                      <button className="p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-green-500 transition-colors">
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-20 rounded-[2.5rem] border border-zinc-100 border-dashed text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                  <Clock size={32} />
                </div>
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">На сегодня записей пока нет</p>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel: Quick Status */}
        <div className="space-y-8">
           <div className="bg-[#0A0A0A] p-10 rounded-[2.5rem] text-white space-y-8 relative overflow-hidden group">
             <div className="relative z-10">
               <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Статус <span className="text-primary italic">студии</span></h3>
               <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-8">Оперативное управление</p>
               
               <div className="space-y-6">
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-bold uppercase text-zinc-400">Онлайн-запись</span>
                   <div className="w-12 h-6 bg-green-500 rounded-full relative p-1">
                     <div className="w-4 h-4 bg-white rounded-full ml-auto" />
                   </div>
                 </div>
                 <div className="flex justify-between items-center text-zinc-400">
                   <span className="text-xs font-bold uppercase">Мастера на смене</span>
                   <span className="text-sm font-black text-white">2</span>
                 </div>
               </div>
             </div>
             {/* Decor */}
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
           </div>

           <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 space-y-6">
             <h3 className="text-sm font-black uppercase tracking-widest">Поддержка</h3>
             <p className="text-zinc-400 text-xs leading-relaxed font-medium">Нужна помощь с настройкой расписания или добавлением услуг?</p>
             <button className="w-full py-4 rounded-2xl bg-zinc-50 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center justify-center gap-2">
               Написать в поддержку
               <ExternalLink size={14} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
