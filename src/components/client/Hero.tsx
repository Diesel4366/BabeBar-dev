'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-white">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-pink-50/30 -skew-x-12 translate-x-32 z-0" />
      <div className="absolute top-40 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl z-0" />

      <div className="container-custom relative z-10">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
          >
            <Sparkles size={14} className="text-primary" />
            Modern Luxe Beauty Studio
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-[#0A0A0A] mb-8"
          >
            ЭСТЕТИКА <br />
            <span className="text-primary italic">ТВОЕГО</span> ОБРАЗА
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-zinc-500 font-medium max-w-lg mb-12 leading-relaxed"
          >
            Профессиональный уход, который подчеркивает вашу индивидуальность. Погрузитесь в атмосферу комфорта и премиального сервиса.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link 
              href="/booking" 
              className="btn-primary py-5 px-10 text-xs flex items-center gap-3 group"
            >
              ЗАПИСАТЬСЯ ОНЛАЙН
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#services" 
              className="flex items-center justify-center py-5 px-10 rounded-full border border-zinc-200 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-colors"
            >
              НАШИ УСЛУГИ
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Side Image / Graphic Component - Optional, but keeping it clean for now */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute right-0 bottom-0 hidden lg:block select-none pointer-events-none"
      >
        <span className="text-[25rem] font-black leading-none text-zinc-900 tracking-tighter">BABE</span>
      </motion.div>
    </section>
  );
};
