'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientClient } from '@/lib/supabase';
import { Service } from '@/types';
import { Plus, Trash2, Edit2, Clock } from 'lucide-react';
import Image from 'next/image';

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (Array.isArray(data)) {
        setServices(data);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return (
    <div className="bg-[#FAFAFA] min-h-screen pt-24 pb-12">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-3xl font-black text-[#0A0A0A] mb-2 tracking-tight uppercase">Услуги</h1>
            <p className="text-zinc-500 font-medium text-sm">Управление каталогом услуг вашей студии</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Добавить новую
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.id} className="card-modern p-0 overflow-hidden flex flex-col">
                <div className="relative h-48 bg-zinc-100 flex items-center justify-center overflow-hidden">
                  {service.image_url ? (
                    <Image src={service.image_url} alt={service.name} fill className="object-cover" />
                  ) : (
                    <span className="text-zinc-300 text-xs font-bold uppercase tracking-widest">No Photo</span>
                  )}
                </div>
                
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-[#0A0A0A] mb-2">{service.name}</h3>
                  <p className="text-zinc-500 text-sm mb-8 line-clamp-2 leading-relaxed">
                    {service.description || 'Описание не добавлено'}
                  </p>
                  
                  <div className="mt-auto space-y-6">
                    <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl">
                      <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase">
                        <Clock size={14} />
                        <span>{service.duration_minutes} мин</span>
                      </div>
                      <div className="text-lg font-black text-primary">
                        {service.price} ₽
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button className="flex-1 py-3 rounded-xl bg-white border border-zinc-100 text-sm font-bold hover:bg-zinc-50 transition-colors flex justify-center items-center gap-2">
                        <Edit2 size={16} />
                        Изменить
                      </button>
                      <button className="p-3 rounded-xl bg-pink-50 text-primary hover:bg-pink-100 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {services.length === 0 && (
              <div className="col-span-full py-32 text-center card-modern">
                <p className="text-zinc-400 font-bold text-sm uppercase tracking-widest">Ваш каталог пуст</p>
                <button className="mt-4 text-primary font-bold">Добавить первую услугу</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
