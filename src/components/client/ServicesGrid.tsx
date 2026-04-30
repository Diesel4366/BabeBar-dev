'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Service } from '@/types';
import { Clock, Star, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ServicesGridProps {
  services: Service[];
}

export const ServicesGrid: React.FC<ServicesGridProps> = ({ services }) => {
  const router = useRouter();

  const handleServiceClick = (service: Service) => {
    router.push(`/booking?serviceId=${service.id}`);
  };

  return (
    <section id="services" className="py-32 bg-white relative overflow-hidden">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-8">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 leading-[0.9]">
              НАШИ <span className="text-primary italic">УСЛУГИ</span>
            </h2>
            <p className="text-zinc-500 font-medium text-lg">
              Мы собрали лучшие процедуры для вашей красоты. Каждый мастер — эксперт в своем деле.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-300">
            <span className="w-12 h-[1px] bg-zinc-100" />
            Selection 2026
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleServiceClick(service)}
              className="card-modern group cursor-pointer p-8 flex flex-col h-full hover:border-primary/20 transition-all duration-500"
            >
              <div className="flex justify-between items-start mb-12">
                <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <Star size={20} fill="currentColor" />
                </div>
                <div className="w-10 h-10 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-300 group-hover:bg-[#0A0A0A] group-hover:text-white group-hover:border-[#0A0A0A] transition-all duration-300">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tight group-hover:text-primary transition-colors duration-300">
                  {service.name}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-medium mb-12 line-clamp-3">
                  {service.description || 'Индивидуальный подход и безупречное качество исполнения для каждого гостя студии.'}
                </p>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-zinc-50">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <Clock size={14} className="text-primary" />
                  <span>{service.duration_minutes} МИН</span>
                </div>
                <div className="text-2xl font-black text-[#0A0A0A]">
                  {service.price} <span className="text-sm font-bold text-zinc-400">₽</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
