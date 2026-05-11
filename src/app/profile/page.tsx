'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Calendar, Clock, LogOut, Settings, X, Sparkles, Camera, Cake, Pencil, Check } from 'lucide-react';

interface AppointmentService {
  services: { name: string; price: number; duration_minutes: number } | null;
}

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'completed' | 'cancelled_by_client' | 'cancelled_by_admin';
  total_price: number;
  appointment_services: AppointmentService[];
}

interface User {
  id: string;
  name: string | null;
  phone: string | null;
  telegram_id: string | null;
  oidc_id: string | null;
  telegram_username: string | null;
  telegram_photo: string | null;
  created_at: string | null;
  birthday: string | null;
  isAdmin: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Ожидается', color: '#D14D72' },
  completed: { label: 'Завершено', color: '#22C55E' },
  cancelled_by_client: { label: 'Отменено вами', color: '#A1A1AA' },
  cancelled_by_admin: { label: 'Отменено мастером', color: '#A1A1AA' },
};

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editBirthday, setEditBirthday] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState('');
  const [birthdaySaving, setBirthdaySaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [meRes, apptRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/user/appointments'),
      ]);
      const me = await meRes.json();
      if (!me) { router.replace('/login'); return; }
      setUser(me);
      const appts = await apptRes.json();
      setAppointments(Array.isArray(appts) ? appts : []);
      setLoading(false);
    }
    load();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    await fetch(`/api/user/appointments?id=${cancelId}`, { method: 'DELETE' });
    setAppointments(a => a.map(x => x.id === cancelId ? { ...x, status: 'cancelled_by_client' as const } : x));
    setCancelId(null);
    setCancelling(false);
  };

  const upcoming = appointments
    .filter(a => a.status === 'active')
    .sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime());

  const past = appointments
    .filter(a => a.status !== 'active')
    .sort((a, b) => new Date(`${b.date}T${b.start_time}`).getTime() - new Date(`${a.date}T${a.start_time}`).getTime());
  const completed = appointments.filter(a => a.status === 'completed');
  const allVisits = appointments.filter(a => !a.status.startsWith('cancelled'));
  const totalSpent = completed.reduce((sum, a) => sum + (a.total_price || 0), 0);

  const handleSaveBirthday = async () => {
    setBirthdaySaving(true);
    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthday: birthdayInput || null }),
    });
    setUser(u => u ? { ...u, birthday: birthdayInput || null } : u);
    setEditBirthday(false);
    setBirthdaySaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    const res = await fetch('/api/user/photo', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) {
      setUser(u => u ? { ...u, telegram_photo: data.url } : u);
      setPhotoError(false);
    }
    setPhotoUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-zinc-100 animate-spin" style={{ borderTopColor: '#D14D72' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-16">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 px-6 py-5 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-100 hover:bg-zinc-50 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <span className="text-sm font-black uppercase tracking-tight">Мой профиль</span>
        <button
          onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-100 hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-zinc-700"
        >
          <LogOut size={16} />
        </button>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-8">

        {/* User card */}
        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-16 h-16 rounded-full flex-shrink-0 group"
              title="Сменить фото"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {user?.telegram_photo && !photoError ? (
                <img
                  src={user.telegram_photo}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ outline: '2px solid #D14D72', outlineOffset: '2px' }}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black"
                  style={{ backgroundColor: '#D14D72' }}
                >
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="absolute inset-0 rounded-full flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                {photoUploading
                  ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Camera size={18} className="text-white" />
                }
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-black text-xl uppercase tracking-tight truncate">{user?.name ?? 'Пользователь'}</div>
              {user?.telegram_username && (
                <div className="text-zinc-400 font-medium text-sm">@{user.telegram_username}</div>
              )}
              {user?.phone && (
                <div className="text-zinc-400 font-medium text-sm">{user.phone}</div>
              )}
            </div>
            {user?.isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-100 hover:border-zinc-200 text-zinc-500 hover:text-zinc-700 transition-all"
              >
                <Settings size={14} />
                Админ
              </Link>
            )}
          </div>

          {/* Birthday */}
          <div className="flex items-center gap-3 pt-2 border-t border-zinc-50">
            <Cake size={16} className="text-zinc-300 flex-shrink-0" />
            {editBirthday ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="date"
                  value={birthdayInput}
                  onChange={e => setBirthdayInput(e.target.value)}
                  className="flex-1 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100 text-sm font-medium outline-none focus:border-zinc-300"
                />
                <button
                  onClick={handleSaveBirthday}
                  disabled={birthdaySaving}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all"
                  style={{ backgroundColor: '#D14D72' }}
                >
                  {birthdaySaving ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                </button>
                <button onClick={() => setEditBirthday(false)} className="w-8 h-8 rounded-xl flex items-center justify-center border border-zinc-100 text-zinc-400 hover:text-zinc-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium text-zinc-500 flex-1">
                  {user?.birthday
                    ? new Date(user.birthday + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
                    : <span className="text-zinc-300">Дата рождения не указана</span>
                  }
                </span>
                <button
                  onClick={() => { setBirthdayInput(user?.birthday ?? ''); setEditBirthday(true); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 transition-all"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-50">
            <div className="text-center">
              <div className="text-2xl font-black">{allVisits.length}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">
                {allVisits.length === 1 ? 'Запись' : 'Записей'}
              </div>
            </div>
            <div className="text-center border-x border-zinc-100">
              <div className="text-2xl font-black">{totalSpent > 0 ? totalSpent.toLocaleString('ru-RU') : '—'}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">{totalSpent > 0 ? 'Потрачено ₽' : 'Ждём вас'}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-black leading-tight mt-1">
                {user?.created_at ? formatMemberSince(user.created_at) : '—'}
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">С нами с</div>
            </div>
          </div>
        </div>

        {/* Connection CTA (only if no telegram_id) */}
        {!user?.telegram_id && (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-[#D14D7240] p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl" style={{ backgroundColor: '#D14D7218' }}>
              🤖
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase tracking-tight">Подключите бота</h3>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                Чтобы записываться онлайн и получать уведомления, нужно связать ваш профиль с Telegram ботом.
              </p>
            </div>
            <a 
              href={`https://t.me/BabeBar_bot?start=${user?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 py-4 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-[#D14D7220]"
              style={{ backgroundColor: '#D14D72' }}
            >
              Подключить @BabeBar_bot
            </a>
          </div>
        )}

        {/* Hint: add phone via bot (only if telegram_id exists but no phone) */}
        {user?.telegram_id && !user?.phone && (
          <div className="bg-white rounded-[2rem] border border-zinc-100 p-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base" style={{ backgroundColor: '#D14D7218' }}>
              📱
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest">Добавить телефон</div>
              <div className="text-zinc-400 text-sm font-medium mt-1 leading-relaxed">
                Напишите боту <span className="font-black">/start</span> и отправьте свой контакт для завершения профиля.
              </div>
            </div>
          </div>
        )}

        {/* Upcoming */}
        <section>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">
            Предстоящие записи {upcoming.length > 0 && `(${upcoming.length})`}
          </div>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-zinc-100 p-8 text-center space-y-4">
              <p className="text-zinc-400 font-bold text-sm uppercase tracking-widest">Нет предстоящих записей</p>
              <Link href="/booking" className="inline-block text-xs font-black uppercase tracking-widest py-3 px-6 rounded-2xl text-white transition-all hover:opacity-90" style={{ backgroundColor: '#D14D72' }}>
                Записаться
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((a, i) => (
                <AppointmentCard
                  key={a.id}
                  appt={a}
                  isNext={i === 0}
                  onCancel={() => setCancelId(a.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">История</div>
            <div className="space-y-3">
              {past.map(a => <AppointmentCard key={a.id} appt={a} showBookAgain />)}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <div className="text-center">
            <Link href="/booking" className="inline-block py-4 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all hover:opacity-90" style={{ backgroundColor: '#D14D72' }}>
              Новая запись
            </Link>
          </div>
        )}
      </div>

      {/* Cancel confirm modal */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Подтверждение</div>
                <h3 className="text-xl font-black uppercase tracking-tight">Отменить запись?</h3>
              </div>
              <button onClick={() => setCancelId(null)} className="text-zinc-300 hover:text-zinc-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <p className="text-zinc-500 text-sm font-medium">Запись будет отменена. Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelId(null)} className="flex-1 py-4 rounded-2xl border border-zinc-100 text-xs font-black uppercase tracking-widest text-zinc-500 hover:border-zinc-200 transition-all">
                Назад
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all"
                style={{ backgroundColor: '#D14D72' }}
              >
                {cancelling ? '...' : 'Отменить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appt,
  isNext = false,
  showBookAgain = false,
  onCancel,
}: {
  appt: Appointment;
  isNext?: boolean;
  showBookAgain?: boolean;
  onCancel?: () => void;
}) {
  const st = STATUS_LABELS[appt.status];
  const services = appt.appointment_services
    .map(s => s.services?.name)
    .filter(Boolean)
    .join(', ');

  const dateStr = new Date(appt.date + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', weekday: 'short',
  });

  return (
    <div
      className="bg-white rounded-[2rem] shadow-sm p-6 space-y-4"
      style={{
        border: isNext ? '1.5px solid #D14D72' : '1px solid #F4F4F5',
      }}
    >
      {isNext && (
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest" style={{ color: '#D14D72' }}>
          <Sparkles size={11} />
          Ближайший визит
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
            <Calendar size={14} style={{ color: '#D14D72' }} />
            {dateStr}
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-sm font-bold">
            <Clock size={13} />
            {appt.start_time.substring(0, 5)} — {appt.end_time.substring(0, 5)}
          </div>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex-shrink-0"
          style={{ color: st.color, backgroundColor: st.color + '18' }}
        >
          {st.label}
        </span>
      </div>

      {services && (
        <p className="text-zinc-500 text-sm font-medium leading-relaxed border-t border-zinc-50 pt-4">{services}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
        <span className="text-lg font-black">{appt.total_price} ₽</span>
        <div className="flex items-center gap-4">
          {showBookAgain && (
            <Link
              href="/booking"
              className="text-[10px] font-black uppercase tracking-widest transition-colors hover:opacity-70"
              style={{ color: '#D14D72' }}
            >
              Записаться снова
            </Link>
          )}
          {appt.status === 'active' && onCancel && (
            <button
              onClick={onCancel}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors"
            >
              Отменить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
