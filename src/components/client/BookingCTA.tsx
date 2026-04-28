'use client';

import React from 'react';
import Link from 'next/link';

export const BookingCTA: React.FC = () => {
  return (
    <div className="bg-white p-10 md:p-16 rounded-[3rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 text-center">
      <h3 className="text-3xl font-black mb-6">Готовы преобразиться?</h3>
      <p className="text-zinc-500 mb-10 font-medium">
        Запишитесь онлайн за пару кликов — выберите мастера и удобное время прямо на сайте.
      </p>
      <Link 
        href="/booking"
        className="btn-primary inline-flex items-center gap-3 text-lg py-5 px-12"
      >
        ЗАПИСАТЬСЯ ОНЛАЙН
      </Link>
    </div>
  );
};
