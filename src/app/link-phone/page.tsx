'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function LinkPhonePage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) return;
    setLoading(true);
    window.location.href = `/api/auth/link-phone?phone=${encodeURIComponent(phone)}`;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-12">
          <Link href="/" className="text-3xl font-black tracking-tighter text-[#0A0A0A] inline-block mb-8">
            BABE<span style={{ color: '#D14D72' }} className="italic">BAR</span>
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Укажите телефон</h1>
          <p className="text-zinc-400 font-medium text-sm leading-relaxed">
            Если вы ранее записывались через Telegram или на сайте — введите тот же номер, и аккаунты объединятся автоматически
          </p>
        </div>

        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              required
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 text-sm font-medium focus:outline-none focus:border-[#D14D72] transition-colors"
            />

            {error && (
              <p className="text-red-500 text-[11px] font-bold uppercase tracking-widest text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: '#D14D72' }}
            >
              {loading ? 'Проверяем...' : 'Продолжить'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <Link
            href="/profile"
            className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest hover:text-zinc-500 transition-colors"
          >
            Пропустить →
          </Link>
        </p>

      </div>
    </div>
  );
}
