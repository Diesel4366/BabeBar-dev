'use client';

import React, { useState } from 'react';
import { XCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  appt: {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    total_price: number;
    profiles: { name: string; telegram_username?: string } | null;
    services: string;
  };
}

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Ожидается', color: 'text-blue-500',  bg: 'bg-blue-500' },
  completed: { label: 'Завершено', color: 'text-green-500', bg: 'bg-green-500' },
};

export default function DashboardAppointmentCard({ appt }: Props) {
  const [status, setStatus] = useState(appt.status);
  const [loading, setLoading] = useState<'cancel' | 'complete' | null>(null);

  const updateStatus = async (newStatus: string, action: 'cancel' | 'complete') => {
    setLoading(action);
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appt.id, status: newStatus }),
      });
      if (res.ok) setStatus(newStatus);
    } finally {
      setLoading(null);
    }
  };

  const sInfo = STATUS_INFO[status] ?? { label: status, color: 'text-zinc-400', bg: 'bg-zinc-400' };
  const isActive = status === 'active';

  return (
    <div className="bg-white p-5 md:p-6 rounded-[1.8rem] md:rounded-[2rem] border border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-md transition-all group/item gap-4">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="text-center min-w-[50px] md:min-w-[60px]">
          <div className="text-base md:text-lg font-black leading-none">{appt.start_time.substring(0, 5)}</div>
          <div className="text-[8px] md:text-[10px] text-zinc-400 font-bold uppercase">{appt.end_time.substring(0, 5)}</div>
        </div>
        <div className="h-8 md:h-10 w-[1px] bg-zinc-100" />
        <div className="min-w-0">
          <div className="font-black text-xs md:text-sm uppercase tracking-tight text-[#0A0A0A] truncate max-w-[150px] md:max-w-none">
            {appt.profiles?.name || 'Клиент'}
          </div>
          <div className="text-[9px] md:text-[10px] text-zinc-400 font-medium italic truncate max-w-[150px] md:max-w-none">
            {appt.services || 'Услуга'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
        <div className="text-left sm:text-right">
          <div className="font-black text-sm">{appt.total_price} ₽</div>
          <div className={`text-[8px] font-black uppercase tracking-widest ${sInfo.color} flex items-center gap-1 sm:justify-end`}>
            <div className={`w-1 h-1 rounded-full ${sInfo.bg}`} />
            {sInfo.label}
          </div>
        </div>

        {isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus('cancelled_by_admin', 'cancel')}
              disabled={loading !== null}
              className="p-2.5 md:p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              title="Отменить"
            >
              {loading === 'cancel'
                ? <div className="w-[18px] h-[18px] border-2 border-zinc-300 border-t-red-400 rounded-full animate-spin" />
                : <XCircle size={18} />
              }
            </button>
            <button
              onClick={() => updateStatus('completed', 'complete')}
              disabled={loading !== null}
              className="p-2.5 md:p-3 rounded-xl bg-zinc-50 text-zinc-400 hover:text-green-500 hover:bg-green-50 transition-colors disabled:opacity-40"
              title="Завершить"
            >
              {loading === 'complete'
                ? <div className="w-[18px] h-[18px] border-2 border-zinc-300 border-t-green-400 rounded-full animate-spin" />
                : <CheckCircle2 size={18} />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
