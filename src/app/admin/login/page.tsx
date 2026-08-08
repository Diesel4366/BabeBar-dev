'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/admin';
      } else {
        setError(data.error || 'Неверный логин или пароль');
        setLoading(false);
      }
    } catch {
      setError('Ошибка соединения. Попробуйте ещё раз.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0A0A0A] rounded-2xl mb-6">
            <Lock size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-[#0A0A0A]">BABEBAR</h1>
          <p className="text-zinc-400 font-medium text-sm mt-2">Панель управления</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-zinc-100 p-10 shadow-sm space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3">
              Логин
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Введите логин"
              className="w-full bg-[#FAFAFA] px-6 py-5 rounded-2xl border border-zinc-100 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full bg-[#FAFAFA] pr-14 pl-6 py-5 rounded-2xl border border-zinc-100 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-sm outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 text-xs font-bold px-5 py-4 rounded-2xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full btn-primary py-5 text-[11px] flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              : 'ВОЙТИ'
            }
          </button>
        </form>
      </motion.div>
    </div>
  );
}
