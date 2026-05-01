'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User } from 'lucide-react';

interface Me {
  name: string | null;
  telegram_photo: string | null;
  isAdmin: boolean;
}

function UserButton() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(setMe).catch(() => setMe(null));
  }, []);

  if (me === undefined) return <div className="w-9 h-9" />;

  if (!me) {
    return (
      <Link
        href="/login"
        className="text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#0A0A0A] transition-colors px-4 py-2 rounded-full border border-zinc-100 hover:border-zinc-200"
      >
        Войти
      </Link>
    );
  }

  return (
    <Link href="/profile" className="flex items-center gap-2 group">
      {me.telegram_photo ? (
        <img src={me.telegram_photo} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-[#D14D72] transition-all" />
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black transition-all" style={{ backgroundColor: '#D14D72' }}>
          {me.name?.[0]?.toUpperCase() ?? <User size={16} />}
        </div>
      )}
      <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-[#0A0A0A] transition-colors hidden lg:block">
        {me.name ?? 'Профиль'}
      </span>
    </Link>
  );
}

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(setMe).catch(() => setMe(null));
  }, []);

  const navLinks = [
    { name: 'Услуги', href: '/#services' },
    { name: 'Галерея', href: '/#gallery' },
    { name: 'Контакты', href: '/#contacts' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled ? 'bg-white/90 backdrop-blur-xl border-b border-zinc-100 py-4' : 'bg-transparent py-6'}`}>
      <div className="container-custom flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="relative z-[110] text-2xl font-black tracking-tighter text-[#0A0A0A] hover:opacity-70 transition-opacity">
          BABE<span style={{ color: '#D14D72' }} className="italic">BAR</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0A0A0A]/50 hover:text-[#0A0A0A] transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <UserButton />
          <Link href="/booking" className="btn-primary py-3 px-8">
            Записаться
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          className="md:hidden relative z-[110] p-2 text-[#0A0A0A] hover:bg-zinc-100 rounded-full transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-white z-[100] flex flex-col p-8 pt-32"
            >
              <div className="flex flex-col gap-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-4xl font-black uppercase tracking-tighter text-[#0A0A0A]"
                  >
                    {link.name}
                  </Link>
                ))}
                {me ? (
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-4xl font-black uppercase tracking-tighter"
                    style={{ color: '#D14D72' }}
                  >
                    Профиль
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-4xl font-black uppercase tracking-tighter text-zinc-400"
                  >
                    Войти
                  </Link>
                )}
              </div>
              <div className="mt-auto">
                <Link
                  href="/booking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-6 text-base rounded-2xl font-black uppercase tracking-widest text-white flex items-center justify-center"
                  style={{ backgroundColor: '#D14D72' }}
                >
                  ЗАПИСАТЬСЯ ОНЛАЙН
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
