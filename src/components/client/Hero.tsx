'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <div className="container-custom relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-[11px] font-bold tracking-[0.2em] uppercase bg-zinc-100 rounded-full text-zinc-500">
            Welcome to BABEBAR
          </span>
          <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tighter">
            ЭСТЕТИКА <br/> <span className="text-primary italic">ТВОЕГО</span> ОБРАЗА
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            Мы объединяем искусство ухода и современные технологии красоты. 
            Создаем безупречный стиль, который подчеркивает вашу индивидуальность.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#services" className="btn-primary w-full sm:w-auto">
              Наши услуги
            </a>
            <a href="https://t.me/babebar_booking_bot" target="_blank" className="btn-secondary w-full sm:w-auto">
              Запись онлайн
            </a>
          </div>
        </motion.div>
      </div>

      {/* Subtle Background Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-pink-50/50 rounded-full blur-[120px] -z-0 opacity-50" />
    </section>
  );
};
