'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl shadow-black/10 border border-zinc-100 p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
          style={{ backgroundColor: '#D14D72' }}
        >
          BB
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm uppercase tracking-tight text-[#0A0A0A]">Добавить на экран</div>
          <div className="text-[10px] text-zinc-400 font-medium mt-0.5">Открывать как приложение</div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowBanner(false)}
            className="text-zinc-300 hover:text-zinc-500 text-xs font-black uppercase tracking-widest"
          >
            ✕
          </button>
          <button
            onClick={install}
            className="px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest"
            style={{ backgroundColor: '#D14D72' }}
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}
