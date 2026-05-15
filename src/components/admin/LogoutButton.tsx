'use client';

import { LogOut } from 'lucide-react';

export default function LogoutButton({ isSidebar }: { isSidebar?: boolean }) {
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  if (isSidebar) {
    return (
      <button
        onClick={handleLogout}
        className="flex items-center justify-between w-full px-6 py-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest group"
      >
        Выйти
        <LogOut size={16} className="group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-zinc-100 bg-white text-zinc-400 hover:text-red-500 hover:border-red-100 transition-all text-[10px] font-black uppercase tracking-widest"
    >
      <LogOut size={16} />
      Выйти
    </button>
  );
}
