import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4">Ошибка 404</p>
        <h1 className="text-8xl md:text-[12rem] font-black uppercase tracking-tighter leading-none text-[#0A0A0A] mb-6">
          BABE<span className="text-primary italic">BAR</span>
        </h1>
        <p className="text-zinc-400 font-medium mb-12 max-w-sm mx-auto">
          Страница не найдена. Возможно, она была перемещена или удалена.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-colors"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
