'use client';

import { useState, useEffect } from 'react';
import { createClientClient } from '@/lib/supabase';
import { Service } from '@/types';
import { Plus, Trash2, Edit2, Clock, DollarSign } from 'lucide-react';

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientClient();

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setServices(data);
    }
    setIsLoading(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold gold-text mb-2">Управление услугами</h1>
          <p className="text-muted-foreground">Добавляйте и редактируйте услуги вашего салона</p>
        </div>
        <button className="gold-button flex items-center gap-2">
          <Plus size={20} />
          Добавить услугу
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="premium-card p-6 flex flex-col justify-between">
              <div>
                <div className="h-40 bg-muted rounded-lg mb-4 flex items-center justify-center text-muted-foreground overflow-hidden">
                  {service.image_url ? (
                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>Нет фото</span>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {service.description || 'Описание не добавлено'}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={16} />
                    <span>{service.duration_minutes} мин</span>
                  </div>
                  <div className="flex items-center gap-1 gold-text font-bold">
                    <DollarSign size={16} />
                    <span>{service.price} ₽</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t border-white/5">
                  <button className="flex-1 py-2 rounded-md bg-white/5 hover:bg-white/10 flex justify-center items-center gap-2 transition-colors">
                    <Edit2 size={16} />
                    <span>Редактировать</span>
                  </button>
                  <button className="p-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="col-span-full py-20 text-center premium-card">
              <p className="text-muted-foreground">У вас пока нет добавленных услуг.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
