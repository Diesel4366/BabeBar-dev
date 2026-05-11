'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, X, Users, Infinity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Client {
  id: string;
  name: string | null;
  phone: string | null;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  profile_id: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
  profile: { id: string; name: string | null; phone: string | null } | null;
}

const EMPTY_FORM = { code: '', discount_percent: '', max_uses: '', expires_at: '', profile_id: '' };

export default function AdminPromo() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/promo').then(r => r.json()),
      fetch('/api/admin/broadcast/clients').then(r => r.json()),
    ]).then(([p, c]) => {
      setPromos(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.code.trim() || !form.discount_percent) {
      setFormError('Код и скидка обязательны');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        discount_percent: Number(form.discount_percent),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        profile_id: form.profile_id || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error || 'Ошибка создания');
    } else {
      setPromos(prev => [data, ...prev]);
      setForm(EMPTY_FORM);
      setClientSearch('');
      setShowForm(false);
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await fetch('/api/admin/promo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !is_active }),
    });
    setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: !is_active } : p));
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Удалить промокод?')) return;
    await fetch(`/api/admin/promo?id=${id}`, { method: 'DELETE' });
    setPromos(prev => prev.filter(p => p.id !== id));
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, code }));
  };

  const filteredClients = clients.filter(c =>
    !clientSearch || c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)
  );

  const activeCount = promos.filter(p => p.is_active).length;

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 rounded-full border-2 border-zinc-100 animate-spin" style={{ borderTopColor: '#D14D72' }} />
      </div>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-12 max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-3">
            Промо<span className="italic" style={{ color: '#D14D72' }}>коды</span>
          </h1>
          <p className="text-zinc-400 font-medium uppercase text-[9px] md:text-[10px] tracking-[0.2em]">
            {activeCount} активных · {promos.length} всего
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all hover:opacity-90 shadow-lg"
          style={{ backgroundColor: '#D14D72' }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Отмена' : 'Создать промокод'}
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="bg-white rounded-[2rem] border border-zinc-100 p-8 space-y-6 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Новый промокод</div>

              {/* Code + discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Код</label>
                  <div className="flex gap-2">
                    <input
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="PROMO20"
                      className="flex-1 bg-zinc-50 px-4 py-3 rounded-xl border border-zinc-100 font-black text-sm outline-none focus:border-zinc-300 uppercase tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={generateCode}
                      className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:border-zinc-300 transition-all whitespace-nowrap"
                    >
                      Авто
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Скидка %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.discount_percent}
                    onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                    placeholder="20"
                    className="w-full bg-zinc-50 px-4 py-3 rounded-xl border border-zinc-100 font-black text-sm outline-none focus:border-zinc-300"
                  />
                </div>
              </div>

              {/* Max uses + expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Макс. использований (пусто = ∞)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    placeholder="∞"
                    className="w-full bg-zinc-50 px-4 py-3 rounded-xl border border-zinc-100 font-black text-sm outline-none focus:border-zinc-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Действует до (пусто = бессрочно)</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    className="w-full bg-zinc-50 px-4 py-3 rounded-xl border border-zinc-100 font-black text-sm outline-none focus:border-zinc-300"
                  />
                </div>
              </div>

              {/* Client (personalized) */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Для клиента (пусто = общий для всех)
                </label>
                {form.profile_id ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <Users size={16} className="text-zinc-400" />
                    <span className="font-black text-sm flex-1">
                      {clients.find(c => c.id === form.profile_id)?.name ?? '—'}{' '}
                      <span className="text-zinc-400 font-medium">{clients.find(c => c.id === form.profile_id)?.phone}</span>
                    </span>
                    <button type="button" onClick={() => { setForm(f => ({ ...f, profile_id: '' })); setClientSearch(''); }} className="text-zinc-300 hover:text-zinc-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      placeholder="Найти клиента по имени или телефону..."
                      className="w-full bg-zinc-50 px-4 py-3 rounded-xl border border-zinc-100 font-medium text-sm outline-none focus:border-zinc-300"
                    />
                    {clientSearch && (
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-100 bg-white shadow-sm">
                        {filteredClients.length === 0 ? (
                          <div className="px-4 py-3 text-zinc-400 text-xs font-medium">Не найдено</div>
                        ) : filteredClients.slice(0, 8).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, profile_id: c.id })); setClientSearch(''); }}
                            className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
                          >
                            <span className="font-black text-sm">{c.name || 'Без имени'}</span>
                            <span className="text-zinc-400 text-xs ml-2">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {formError && (
                <div className="bg-red-50 text-red-500 text-xs font-bold px-4 py-3 rounded-xl">{formError}</div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#D14D72' }}
              >
                {saving ? 'Создание...' : 'Создать промокод'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {promos.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-[2.5rem] border border-zinc-100 border-dashed">
          <Tag size={32} className="text-zinc-200 mx-auto mb-4" />
          <p className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.3em]">Промокодов пока нет</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {promos.map(promo => {
            const isExpired = promo.expires_at ? new Date(promo.expires_at) < new Date() : false;
            const isExhausted = promo.max_uses !== null && promo.used_count >= promo.max_uses;
            const effectivelyActive = promo.is_active && !isExpired && !isExhausted;

            return (
              <motion.div
                key={promo.id}
                layout
                className="bg-white rounded-[2rem] border border-zinc-100 p-6 md:p-8 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex items-start gap-5">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: effectivelyActive ? '#D14D7218' : '#F4F4F5', color: effectivelyActive ? '#D14D72' : '#A1A1AA' }}
                    >
                      <Tag size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="text-xl font-black tracking-widest uppercase">{promo.code}</span>
                        <span
                          className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: effectivelyActive ? '#D14D7218' : '#F4F4F5',
                            color: effectivelyActive ? '#D14D72' : '#A1A1AA',
                          }}
                        >
                          {isExpired ? 'Истёк' : isExhausted ? 'Исчерпан' : promo.is_active ? 'Активен' : 'Отключён'}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-zinc-50 text-zinc-400">
                          {promo.profile_id ? 'Персональный' : 'Общий'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-zinc-400">
                        <span style={{ color: '#D14D72' }} className="font-black">−{promo.discount_percent}%</span>
                        <span className="flex items-center gap-1">
                          {promo.max_uses === null
                            ? <><Infinity size={12} /> безлимит</>
                            : <>{promo.used_count} / {promo.max_uses} использований</>
                          }
                        </span>
                        {promo.expires_at && (
                          <span>до {new Date(promo.expires_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        )}
                        {promo.profile && (
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {promo.profile.name || promo.profile.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <button
                      onClick={() => toggleActive(promo.id, promo.is_active)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:border-zinc-300 transition-all"
                    >
                      {promo.is_active
                        ? <ToggleRight size={16} style={{ color: '#D14D72' }} />
                        : <ToggleLeft size={16} />
                      }
                      {promo.is_active ? 'Вкл' : 'Выкл'}
                    </button>
                    <button
                      onClick={() => deletePromo(promo.id)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-100 text-zinc-300 hover:border-red-200 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
