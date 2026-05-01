'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, Calendar, CheckCircle2, Phone, User, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Service } from '@/types';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceIdFromUrl = searchParams.get('serviceId');
  
  const [step, setStep] = useState(1);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [occupiedIntervals, setOccupiedIntervals] = useState<{start: string, end: string}[]>([]);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [workingHours, setWorkingHours] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        setAllServices(data);

        if (serviceIdFromUrl) {
          const service = data.find((s: Service) => s.id === serviceIdFromUrl);
          if (service) setSelectedServices([service]);
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    loadData();
  }, [serviceIdFromUrl]);

  useEffect(() => {
    if (selectedDate) {
      async function checkAvailability() {
        try {
          const formattedDate = selectedDate!.toISOString().split('T')[0];
          const res = await fetch(`/api/availability?date=${formattedDate}`, { cache: 'no-store' });
          const data = await res.json();
          if (data.occupiedIntervals) setOccupiedIntervals(data.occupiedIntervals);
          setWorkingHours(data.workingHours ?? null);
          setSelectedTime(null);
        } catch (err) {
          console.error('Failed to fetch availability:', err);
        }
      }
      checkAvailability();
    }
  }, [selectedDate]);

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
  };

  const isSlotAvailable = (time: string) => {
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const newStart = timeToMinutes(time);
    const newEnd = newStart + totalDuration;

    for (const interval of occupiedIntervals) {
      const extStart = timeToMinutes(interval.start);
      const extEnd = timeToMinutes(interval.end);

      if (newStart < extEnd && newEnd > extStart) {
        return false;
      }
    }
    return true;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 1) return numbers.length === 1 ? '+7' : '';
    let formatted = '+7';
    if (numbers.length > 1) formatted += ' (' + numbers.substring(1, 4);
    if (numbers.length >= 5) formatted += ') ' + numbers.substring(4, 7);
    if (numbers.length >= 8) formatted += '-' + numbers.substring(7, 9);
    if (numbers.length >= 10) formatted += '-' + numbers.substring(9, 11);
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone.length < 18) {
      alert('Пожалуйста, введите полный номер телефона');
      return;
    }
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
        alert('Ошибка при записи: ' + data.error);
      }
    } catch (error) {
      alert('Произошла ошибка при соединении с сервером');
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-100 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm space-y-10">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto shadow-sm">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black uppercase tracking-tighter">ВЫ ЗАПИСАНЫ!</h1>
            <p className="text-zinc-500 font-medium">Мы получили вашу запись на {selectedDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в {selectedTime}. Скоро свяжемся!</p>
          </div>
          <Link href="/" className="btn-primary w-full py-6">НА ГЛАВНУЮ</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 py-6 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => step > 1 ? setStep(step - 1) : router.push('/')}
              className="w-10 h-10 flex items-center justify-center hover:bg-zinc-50 rounded-full transition-colors border border-zinc-100"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tighter">ОНЛАЙН ЗАПИСЬ</h1>
          </div>
          <div className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em] hidden sm:block">
            Step {step} / 3
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 py-12 pb-40">
        <AnimatePresence mode="wait">
          {/* Step 1: Services */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter">ВЫБЕРИТЕ УСЛУГИ</h2>
                <p className="text-zinc-400 font-medium">Добавьте процедуры, которые хотите посетить</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {allServices.map(service => {
                  const isSelected = selectedServices.some(s => s.id === service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service)}
                      className={`text-left p-6 rounded-3xl border transition-all duration-300 flex justify-between items-center ${
                        isSelected ? 'border-primary bg-pink-50/20' : 'border-white bg-white hover:border-zinc-200 shadow-sm'
                      }`}
                    >
                      <div className="flex gap-5 items-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-zinc-50 text-zinc-400'}`}>
                          <Star size={20} fill={isSelected ? 'currentColor' : 'none'} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight mb-1 uppercase tracking-tight">{service.name}</h3>
                          <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Clock size={12} /> {service.duration_minutes} МИН</span>
                            <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                            <span className="text-zinc-900">{service.price} ₽</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary text-white' : 'border-zinc-100'}`}>
                        {isSelected && <CheckCircle2 size={14} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter">ВРЕМЯ ЗАПИСИ</h2>
                <p className="text-zinc-400 font-medium">Выберите удобный день и время посещения</p>
              </div>

              <section>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Выберите дату</span>
                  <span className="text-xs font-bold text-primary">{selectedDate?.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                  {[...Array(14)].map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`min-w-[70px] aspect-[4/5] flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 ${
                          isSelected ? 'border-primary bg-primary text-white shadow-xl shadow-primary/20' : 'border-white bg-white hover:border-zinc-200 shadow-sm'
                        }`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${isSelected ? 'text-white/60' : 'text-zinc-300'}`}>
                          {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                        </span>
                        <span className="text-xl font-black">{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {selectedDate && (
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-6">Свободное время</span>
                  {workingHours === null ? (
                    <div className="py-12 text-center rounded-3xl border border-zinc-100 bg-white">
                      <p className="text-zinc-400 font-bold uppercase text-sm tracking-widest">Нерабочий день</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {(() => {
                        const times: string[] = [];
                        const [startH] = workingHours.start.split(':').map(Number);
                        const [endH] = workingHours.end.split(':').map(Number);
                        for (let hour = startH; hour < endH; hour++) {
                          times.push(`${hour}:00`);
                          times.push(`${hour}:30`);
                        }
                        return times.map(time => {
                          const isSelected = selectedTime === time;
                          const isAvailable = isSlotAvailable(time);
                          return (
                            <button
                              key={time}
                              disabled={!isAvailable}
                              onClick={() => setSelectedTime(time)}
                              className={`py-5 rounded-2xl border font-black text-sm transition-all duration-300 ${
                                isSelected ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' :
                                !isAvailable ? 'border-zinc-50 bg-zinc-50 text-zinc-200 cursor-not-allowed opacity-50' :
                                'border-white bg-white hover:border-zinc-200 shadow-sm'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </motion.section>
              )}
            </motion.div>
          )}

          {/* Step 3: Contacts */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter">ВАШИ ДАННЫЕ</h2>
                <p className="text-zinc-400 font-medium">Осталось совсем чуть-чуть</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-12">
                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                      type="text"
                      required
                      placeholder="Ваше имя"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white pl-16 pr-8 py-6 rounded-3xl border border-zinc-100 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold"
                    />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                      type="tel"
                      required
                      placeholder="+7 (999) 000-00-00"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-white pl-16 pr-8 py-6 rounded-3xl border border-zinc-100 focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold"
                    />
                  </div>
                </div>

                <div className="bg-[#0A0A0A] text-white p-10 rounded-[3rem] shadow-2xl space-y-10">
                  <div className="flex justify-between items-end border-b border-white/10 pb-8">
                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Итог записи</span>
                    <span className="text-3xl font-black leading-none">{totalPrice} ₽</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block mb-2">Дата</span>
                      <span className="font-bold text-sm uppercase">{selectedDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block mb-2">Время</span>
                      <span className="font-bold text-sm uppercase">{selectedTime}</span>
                    </div>
                  </div>

                  <button
                    disabled={loading || !formData.name || !formData.phone}
                    type="submit"
                    className="w-full bg-primary py-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-pink-600 transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>ПОДТВЕРДИТЬ <ArrowRight size={18} /></>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Button Mobile */}
      {selectedServices.length > 0 && step < 3 && !success && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-zinc-100 z-40">
          <div className="max-w-4xl mx-auto flex justify-between items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Сумма</span>
              <span className="text-xl font-black">{totalPrice} ₽</span>
            </div>
            <button
              disabled={step === 1 ? selectedServices.length === 0 : !selectedDate || !selectedTime}
              onClick={() => setStep(step + 1)}
              className="btn-primary flex-1 py-5 text-[10px]"
            >
              {step === 1 ? 'ВЫБРАТЬ ВРЕМЯ' : 'ДАЛЕЕ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-zinc-100 border-t-primary rounded-full animate-spin" /></div>}>
      <BookingContent />
    </Suspense>
  );
}
