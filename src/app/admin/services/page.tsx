'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientClient } from '@/lib/supabase';
import { Service } from '@/types';
import { Plus, Trash2, Edit2, Clock, DollarSign } from 'lucide-react';
import Image from 'next/image';

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientClient();

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setServices(data);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2D3436] mb-2 font-display uppercase tracking-tight">Управление услугами</h1>
          <p className="text-muted-foreground font-medium">Создавайте и редактируйте предложения вашего салона</p>
        </div>
        <button className="bg-primary text-white font-bold py-3 px-8 rounded-[24px] flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20">
          <Plus size={20} />
          Добавить услугу
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div key={service.id} className="soft-card p-6 flex flex-col justify-between min-h-[400px]">
              <div>
                <div className="relative h-48 bg-[#FAF5F7] rounded-[1.5rem] mb-6 flex items-center justify-center text-muted-foreground overflow-hidden border border-pink-100">
                  {service.image_url ? (
                    <Image src={service.image_url} alt={service.name} fill className="object-cover" />
                  ) : (
                    <span className="text-4xl">✨</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-[#2D3436] mb-2">{service.name}</h3>
                <p className="text-muted-foreground text-sm mb-6 line-clamp-3 leading-relaxed">
                  {service.description || 'Индивидуальный подход и лучшие материалы для вашей красоты.'}
                </p>
              </div>
              
              <div className="space-y-4 pt-6 border-t border-pink-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[#2D3436] font-semibold text-sm bg-[#FAF5F7] px-3 py-1 rounded-full">
                    <Clock size={14} className="text-primary" />
                    <span>{service.duration_minutes} мин</span>
                  </div>
                  <div className="text-xl font-bold text-primary">
                    {service.price} ₽
                  </div>
                </div>
                
                <div className="flex gap-3 mt-4">
                  <button className="flex-1 py-3 rounded-2xl bg-[#FAF5F7] text-[#2D3436] font-bold hover:bg-pink-50 flex justify-center items-center gap-2 transition-colors border border-pink-100">
                    <Edit2 size={16} />
                    <span>Правка</span>
                  </button>
                  <button className="p-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors border border-red-100">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="col-span-full py-24 text-center soft-card">
              <p className="text-xl font-medium text-muted-foreground">У вас пока нет добавленных услуг.</p>
              <button className="mt-4 text-primary font-bold hover:underline">Добавить первую услугу</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
