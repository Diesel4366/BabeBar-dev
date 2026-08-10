'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Users, Phone, Calendar, Send, Cake, ChevronDown, Check, X, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Client {
  id: string;
  name: string | null;
  phone: string | null;
  nickname: string | null;
  telegram_username: string | null;
  telegram_id: string | null;
  vk_id: string | null;
  created_at: string;
  birthday: string | null;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
}

function ClientCard({ client: initial }: { client: Client }) {
  const [client, setClient] = useState(initial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: initial.name ?? '',
    phone: initial.phone ?? '',
    nickname: initial.nickname ?? '',
    telegram_username: initial.telegram_username ?? '',
    telegram_id: initial.telegram_id ?? '',
    vk_id: initial.vk_id ?? '',
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setClient(c => ({ ...c, ...form }));
      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
    }
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden hover:shadow-xl transition-all duration-500 group">
      {/* Main row */}
      <div className="p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="flex gap-8 items-center">
          <Link href={`/admin/clients/${client.id}`} className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors flex-shrink-0">
            <Users size={32} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href={`/admin/clients/${client.id}`} className="text-2xl font-black uppercase tracking-tight text-[#0A0A0A] hover:text-primary transition-colors">
                {client.name || 'Без имени'}
              </Link>
              {client.nickname && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: '#D14D72' }}>
                  {client.nickname}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-5 text-xs font-bold text-zinc-400">
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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.566c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C5.31 11.226 4.76 8.99 4.76 8.49c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.169-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
                  </svg>
                  VK
                </a>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                <span>{format(new Date(client.created_at), 'd MMMM yyyy', { locale: ru })}</span>
              </div>
              {client.birthday && (
                <div className="flex items-center gap-2">
                  <Cake size={14} className="text-primary" />
                  <span>ДР: {format(new Date(client.birthday + 'T12:00:00'), 'd MMMM', { locale: ru })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-8 lg:text-right">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">Визитов</div>
            <div className="text-2xl font-black">{client.totalVisits}</div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">LTV</div>
            <div className="text-2xl font-black text-primary">{client.totalSpent} ₽</div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">Последний раз</div>
            <div className="text-sm font-black uppercase tracking-tighter">
              {client.lastVisit ? format(new Date(client.lastVisit), 'd MMM yyyy', { locale: ru }) : '—'}
            </div>
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-10 h-10 rounded-2xl border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-primary hover:border-primary/30 transition-all"
          >
            {open ? <X size={16} /> : <Pencil size={15} />}
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {open && (
        <div className="border-t border-zinc-100 px-10 py-8 bg-zinc-50/50 space-y-6">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Редактировать клиента</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              { key: 'name', label: 'Имя', placeholder: 'Полное имя' },
              { key: 'phone', label: 'Телефон', placeholder: '+7 (999) 000-00-00' },
              { key: 'nickname', label: 'Прозвище (только в админке)', placeholder: 'Постоянная, VIP, Проблемная...' },
              { key: 'telegram_username', label: 'Telegram @username', placeholder: 'username (без @)' },
              { key: 'telegram_id', label: 'Telegram ID', placeholder: '123456789' },
              { key: 'vk_id', label: 'VK ID', placeholder: '12345678' },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key} className={key === 'nickname' ? 'sm:col-span-2 lg:col-span-1' : ''}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  {label}
                </label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={f(key)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white text-sm font-medium focus:outline-none focus:border-[#D14D72] transition-colors"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: '#D14D72' }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <><Check size={14} /> Сохранено</>
              ) : (
                'Сохранить'
              )}
            </button>
            <button
              onClick={() => { setOpen(false); setForm({ name: client.name ?? '', phone: client.phone ?? '', nickname: client.nickname ?? '', telegram_username: client.telegram_username ?? '', telegram_id: client.telegram_id ?? '', vk_id: client.vk_id ?? '' }); }}
              className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-zinc-200 text-zinc-500 hover:border-zinc-300 transition-all"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsClient({ clients }: { clients: Client[] }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {clients.length > 0 ? (
        clients.map(client => <ClientCard key={client.id} client={client} />)
      ) : (
        <div className="py-40 text-center bg-white rounded-[3rem] border border-zinc-100 border-dashed">
          <p className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.3em]">Список клиентов пуст</p>
        </div>
      )}
    </div>
  );
}
