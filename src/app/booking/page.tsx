'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Clock, Calendar, CheckCircle2, Phone, User, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Service } from '@/types';

// Компонент-обертка для использования searchParams
function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [allServices, setAllServices] = useState<Service[]>([]);

  // Загрузка услуг
  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch('/api/services'); // Предположим, у нас есть такой роут или получим из supabase напрямую
        // Если роута нет, пока используем пустой список или моки
        // Для теста добавим возможность передать ID через URL
        const serviceId = searchParams.get('service');
        if (serviceId) {
          // Логика авто-выбора услуги из URL
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchServices();
  }, [searchParams]);

  // Временный хак: если услуг нет, дадим выбрать из списка на первом шаге
  // Но лучше, если мы будем приходить сюда уже с выбранными услугами или выбирать их тут

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          date: selectedDate?.toISOString(),
          time: selectedTime,
          services: selectedServices,
          totalPrice
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Произошла ошибка при записи');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 max-w-sm"
        >
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-black uppercase">Вы записаны!</h1>
          <p className="text-zinc-500 font-medium">
            Мы уже получили вашу заявку и скоро свяжемся с вами для подтверждения.
          </p>
          <Link href="/" className="btn-primary w-full">
            НА ГЛАВНУЮ
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 py-6 px-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => step > 1 ? setStep(step - 1) : router.push('/')} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tighter">Запись онлайн</h1>
          </div>
          <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
            Шаг {step} из 3
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Services Selection (If coming from Home, this might be pre-filled) */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black uppercase leading-none">Выбор услуг</h2>
                <div className="text-primary font-bold text-sm">{totalPrice} ₽</div>
              </div>

              {selectedServices.length > 0 ? (
                <div className="space-y-4">
                  {selectedServices.map(service => (
                    <div key={service.id} className="bg-white p-6 rounded-3xl border border-zinc-100 flex justify-between items-center shadow-sm">
                      <div>
                        <h3 className="font-bold">{service.name}</h3>
                        <p className="text-xs text-zinc-400 font-bold uppercase">{service.duration_minutes} мин</p>
                      </div>
                      <button onClick={() => setSelectedServices(prev => prev.filter(s => s.id !== service.id))} className="text-zinc-300 hover:text-red-500 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setStep(2)}
                    className="btn-primary w-full py-5 text-sm uppercase tracking-widest mt-8 flex justify-between items-center px-10"
                  >
                    <span>Продолжить</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <div className="bg-white p-12 rounded-[2rem] border border-dashed border-zinc-200 text-center space-y-4">
                  <p className="text-zinc-400 font-medium">Услуги не выбраны</p>
                  <Link href="/#services" className="text-primary font-bold hover:underline">
                    Вернуться к списку услуг
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <section>
                <h2 className="text-xl font-black uppercase mb-6 tracking-tight">Выберите дату</h2>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                  {[...Array(14)].map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-2xl border transition-all ${
                          isSelected ? 'border-primary bg-pink-50 text-primary shadow-md' : 'border-zinc-100 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase opacity-40 mb-1">
                          {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-black">{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {selectedDate && (
                <section>
                  <h2 className="text-xl font-black uppercase mb-6 tracking-tight">Выберите время</h2>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(time => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-4 rounded-2xl border font-bold transition-all ${
                            isSelected ? 'border-primary bg-pink-50 text-primary shadow-md' : 'border-zinc-100 bg-white hover:border-zinc-300'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {selectedDate && selectedTime && (
                <button 
                  onClick={() => setStep(3)}
                  className="btn-primary w-full py-5 text-sm uppercase tracking-widest flex justify-between items-center px-10"
                >
                  <span>Далее</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </motion.div>
          )}

          {/* Step 3: Contacts */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-black uppercase leading-tight">Ваши <br/> контакты</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                    <input
                      type="text"
                      required
                      placeholder="Ваше имя"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white pl-16 pr-6 py-5 rounded-[1.5rem] border border-zinc-100 focus:outline-none focus:border-primary transition-all font-bold text-[#0A0A0A]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                    <input
                      type="tel"
                      required
                      placeholder="+7 (___) ___-__-__"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white pl-16 pr-6 py-5 rounded-[1.5rem] border border-zinc-100 focus:outline-none focus:border-primary transition-all font-bold text-[#0A0A0A]"
                    />
                  </div>
                </div>

                <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] mt-12 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Итого к оплате</span>
                    <span className="text-2xl font-black">{totalPrice} ₽</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block mb-1">Дата</span>
                      <span className="font-bold">{selectedDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest block mb-1">Время</span>
                      <span className="font-bold">{selectedTime}</span>
                    </div>
                  </div>
                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-primary py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-pink-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Отправка...' : 'Подтвердить запись'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <BookingContent />
    </Suspense>
  );
}
