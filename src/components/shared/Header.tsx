'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
          BABE<span className="text-primary italic">BAR</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href} 
              className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0A0A0A]/50 hover:text-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <Link 
            href="/booking"
            className="btn-primary py-3 px-8"
          >
            Записаться
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden relative z-[110] p-2 text-[#0A0A0A] hover:bg-zinc-100 rounded-full transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu Overlay */}
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
                    className="text-4xl font-black uppercase tracking-tighter text-[#0A0A0A] hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
              
              <div className="mt-auto">
                <Link 
                  href="/booking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-primary w-full py-6 text-base"
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
