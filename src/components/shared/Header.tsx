'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-zinc-100 py-3' : 'bg-transparent py-5'}`}>
      <div className="container-custom flex justify-between items-center">
        <Link href="/" className="text-xl font-extrabold tracking-tighter text-[#0A0A0A]">
          BABE<span className="text-primary italic">BAR</span>
        </Link>
        
        <nav className="hidden md:flex gap-10">
          <a href="/#services" className="text-[13px] font-bold uppercase tracking-wider text-[#0A0A0A]/70 hover:text-[#0A0A0A] transition-colors">Услуги</a>
          <a href="/#contacts" className="text-[13px] font-bold uppercase tracking-wider text-[#0A0A0A]/70 hover:text-[#0A0A0A] transition-colors">Контакты</a>
        </nav>

        <Link 
          href="/booking"
          className="bg-[#0A0A0A] text-white text-[12px] font-bold px-5 py-2.5 rounded-full hover:bg-zinc-800 transition-all uppercase tracking-widest"
        >
          ЗАПИСАТЬСЯ
        </Link>
      </div>
    </header>
  );
};
