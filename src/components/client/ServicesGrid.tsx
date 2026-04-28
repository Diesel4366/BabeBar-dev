'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Service } from '@/types';
import { Clock, Star, Plus, Check } from 'lucide-react';
import { useBooking } from '@/context/BookingContext';

interface ServicesGridProps {
  services: Service[];
}

export const ServicesGrid: React.FC<ServicesGridProps> = ({ services }) => {
  const { toggleService, selectedServices, setIsDrawerOpen } = useBooking();

  const handleServiceClick = (service: Service) => {
    toggleService(service);
    setIsDrawerOpen(true);
  };

  return (
    <section id="services" className="py-24 bg-white">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Наши услуги</h2>
            <p className="text-zinc-500 max-w-md font-medium">
              Выберите процедуру, которая преобразит вас. Мы используем только премиальные материалы.
            </p>
          </div>
          <div className="hidden md:block">
            <span className="text-zinc-100 text-8xl font-black leading-none uppercase select-none">Services</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const isSelected = selectedServices.some(s => s.id === service.id);
            
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`card-modern group transition-all duration-500 ${isSelected ? 'border-primary ring-1 ring-primary/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isSelected ? 'bg-primary text-white scale-110' : 'bg-pink-50 text-primary group-hover:scale-110'}`}>
                    <Star size={24} fill="currentColor" />
                  </div>
                  <button
                    onClick={() => handleServiceClick(service)}
                    className={`p-3 rounded-xl border transition-all duration-300 ${
                      isSelected 
                        ? 'bg-primary border-primary text-white' 
                        : 'border-zinc-100 hover:border-primary hover:text-primary text-zinc-300'
                    }`}
                  >
                    {isSelected ? <Check size={20} /> : <Plus size={20} />}
                  </button>
                </div>
                
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {service.name}
                </h3>
                
                <p className="text-zinc-500 text-sm leading-relaxed mb-10 line-clamp-3">
                  {service.description || 'Индивидуальный подход и безупречное качество исполнения для каждого гостя.'}
                </p>

                <div className="flex justify-between items-center pt-6 border-t border-zinc-50">
                  <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs uppercase tracking-tighter">
                    <Clock size={14} />
                    <span>{service.duration_minutes} мин</span>
                  </div>
                  <div className="text-2xl font-black text-[#0A0A0A]">
                    {service.price} ₽
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
