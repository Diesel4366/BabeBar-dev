'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Clock, CheckCircle2, Phone, User, Star, ArrowRight, Plus, LogIn, Tag, X } from 'lucide-react';
import Link from 'next/link';
import { Service } from '@/types';
import { CATEGORY_ORDER } from '@/lib/config';
import BookingSuccessModal from '@/components/BookingSuccessModal';

function toLocalKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceIdFromUrl = searchParams.get('serviceId');

  const [step, setStep] = useState(1);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [activeBookingCategory, setActiveBookingCategory] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [occupiedIntervals, setOccupiedIntervals] = useState<{ start: string; end: string }[]>([]);
  const [workingHours, setWorkingHours] = useState<{ start: string; end: string } | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [authUser, setAuthUser] = useState<{ name: string | null; phone: string | null } | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [workingDates, setWorkingDates] = useState<Set<string>>(new Set());
  const [promoInput, setPromoInput] = useState('');
  const [promoData, setPromoData] = useState<{ codeId: string; percent: number; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Derived service groups
  const mainServices = allServices.filter(s => !s.is_addon);
  const addonServices = allServices.filter(s => s.is_addon);
  const bookingCategories = CATEGORY_ORDER.filter(cat => mainServices.some(s => s.category === cat));
  const mainServicesForCategory = mainServices.filter(s => s.category === activeBookingCategory);
  const categoryAddons = addonServices.filter(s => s.addon_for_category === activeBookingCategory);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(me => {
      if (me) {
        setAuthUser({ name: me.name, phone: me.phone ?? '' });
        setFormData({ name: me.name ?? '', phone: formatPhone(me.phone ?? '') });
        // Восстанавливаем состояние если вернулись после авторизации
        if (searchParams.get('restore')) {
          try {
            const saved = sessionStorage.getItem('booking_state');
            if (saved) {
              const s = JSON.parse(saved);
              if (s.selectedServices) setSelectedServices(s.selectedServices);
              if (s.selectedDate) setSelectedDate(new Date(s.selectedDate));
              if (s.selectedTime) setSelectedTime(s.selectedTime);
              if (s.step) setStep(s.step);
              sessionStorage.removeItem('booking_state');
            }
          } catch {}
        }
      } else {
        setAuthUser(null);
      }
    });
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date();
        const from = toLocalKey(today);
        const toDate = new Date(today);
        toDate.setDate(today.getDate() + 59);
        const to = toLocalKey(toDate);

        const [servicesRes, scheduleRes] = await Promise.all([
          fetch('/api/services'),
          fetch(`/api/schedule?from=${from}&to=${to}`),
        ]);

        const data: Service[] = await servicesRes.json();
        setAllServices(data);

        const schedule: { date: string }[] = await scheduleRes.json();
        setWorkingDates(new Set(Array.isArray(schedule) ? schedule.map(s => s.date) : []));

        const mains = data.filter(s => !s.is_addon);
        const defaultCat = CATEGORY_ORDER.find(cat => mains.some(s => s.category === cat)) ?? '';

        if (serviceIdFromUrl) {
          const service = data.find(s => s.id === serviceIdFromUrl);
          if (service) {
            setSelectedServices([service]);
            setActiveBookingCategory(service.category ?? defaultCat);
          } else {
            setActiveBookingCategory(defaultCat);
          }
        } else {
          setActiveBookingCategory(defaultCat);
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
          const formattedDate = toLocalKey(selectedDate!);
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

  // Пересчитываем скидку при изменении набора услуг
  useEffect(() => {
    if (promoData) {
      setPromoData(d => d ? { ...d, discount: Math.round(totalPrice * d.percent / 100) } : null);
    }
  }, [totalPrice]);

  const finalPrice = totalPrice - (promoData?.discount ?? 0);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoData(null);
    const res = await fetch(`/api/promo/validate?code=${encodeURIComponent(promoInput.trim())}`);
    const data = await res.json();
    if (data.valid) {
      setPromoData({ codeId: data.codeId, percent: data.percent, discount: Math.round(totalPrice * data.percent / 100) });
    } else {
      setPromoError(data.error || 'Промокод недействителен');
    }
    setPromoLoading(false);
  };

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
  };

  const isSlotAvailable = (time: string) => {
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const newStart = toMins(time);
    const newEnd = newStart + totalDuration;

    // Если выбран сегодняшний день — скрываем прошедшие слоты
    if (selectedDate) {
      const today = new Date();
      const sel = selectedDate;
      const isToday = sel.getFullYear() === today.getFullYear() &&
        sel.getMonth() === today.getMonth() &&
        sel.getDate() === today.getDate();
      if (isToday) {
        const nowMins = today.getHours() * 60 + today.getMinutes();
        if (newStart <= nowMins) return false;
      }
    }

    return !occupiedIntervals.some(iv => newStart < toMins(iv.end) && newEnd > toMins(iv.start));
  };

  const handleTelegramLogin = () => {
    sessionStorage.setItem('booking_state', JSON.stringify({
      selectedServices,
      selectedDate: selectedDate?.toISOString() ?? null,
      selectedTime,
      step,
    }));
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/telegram/callback`);
    window.location.href = `https://oauth.telegram.org/auth?client_id=8752821995&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile&state=booking`;
  };

  const formatPhone = (value: string) => {
    const n = value.replace(/\D/g, '');
    if (n.length <= 1) return n.length === 1 ? '+7' : '';
    let f = '+7';
    if (n.length > 1) f += ' (' + n.substring(1, 4);
    if (n.length >= 5) f += ') ' + n.substring(4, 7);
    if (n.length >= 8) f += '-' + n.substring(7, 9);
    if (n.length >= 10) f += '-' + n.substring(9, 11);
    return f;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    const digits = formData.phone.replace(/\D/g, '');
    if (digits.length < 11) { 
      setBookingError('Пожалуйста, введите полный номер телефона'); 
      return; 
    }
    setLoading(true);
    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone, date: selectedDate?.toISOString(), time: selectedTime, services: selectedServices, totalPrice: finalPrice, promoCodeId: promoData?.codeId, discountAmount: promoData?.discount ?? 0 }),
      });
      const data = await response.json();
      if (data.success) setSuccess(true);
      else setBookingError(data.error || 'Ошибка при создании записи');
    } catch {
      setBookingError('Ошибка соединения с сервером. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
    router.push('/');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-100 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <BookingSuccessModal 
        isOpen={success} 
        onClose={handleCloseSuccess}
        data={success ? {
          date: selectedDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) || '',
          time: selectedTime || '',
          services: selectedServices,
          totalPrice: finalPrice
        } : null}
      />

      <header className="bg-white border-b border-zinc-100 py-6 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button
              onClick={() => { setBookingError(null); step > 1 ? setStep(step - 1) : router.push('/'); }}
              aria-label="Назад"
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
            <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
              <div className="space-y-2">
                <h2 className="text-4xl font-black uppercase tracking-tighter">ВЫБЕРИТЕ УСЛУГИ</h2>
                <p className="text-zinc-400 font-medium">Добавьте процедуры, которые хотите посетить</p>
              </div>

              {/* Вкладки категорий */}
              <div className="flex gap-2 flex-wrap">
                {bookingCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveBookingCategory(cat)}
                    className={`px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                      activeBookingCategory === cat
                        ? 'bg-[#0A0A0A] text-white'
                        : 'bg-white border border-zinc-100 text-zinc-400 hover:border-zinc-200 shadow-sm'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Основные услуги */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBookingCategory}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-10"
                >
                  <div className="grid grid-cols-1 gap-3">
                    {mainServicesForCategory.map(service => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => toggleService(service)}
                          className="text-left p-6 rounded-3xl border transition-all duration-300 flex justify-between items-center"
                          style={{
                            borderColor: isSelected ? '#D14D72' : undefined,
                            backgroundColor: isSelected ? '#fdf2f5' : 'white',
                            boxShadow: isSelected ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                        >
                          <div className="flex gap-5 items-center">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0"
                              style={{
                                backgroundColor: isSelected ? '#D14D72' : '#F4F4F5',
                                color: isSelected ? 'white' : '#A1A1AA',
                              }}
                            >
                              <Star size={20} fill={isSelected ? 'currentColor' : 'none'} />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg leading-tight mb-1 uppercase tracking-tight">{service.name}</h3>
                              <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Clock size={12} /> {service.duration_minutes} МИН</span>
                                <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                <span className="text-zinc-900">{service.price > 0 ? `${service.price} ₽` : 'Бесплатно'}</span>
                              </div>
                            </div>
                          </div>
                          <div
                            className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
                            style={{
                              borderColor: isSelected ? '#D14D72' : '#E4E4E7',
                              backgroundColor: isSelected ? '#D14D72' : 'transparent',
                              color: 'white',
                            }}
                          >
                            {isSelected && <CheckCircle2 size={14} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Дополнительные услуги */}
                  {categoryAddons.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Дополнительно</span>
                        <span className="flex-1 h-px bg-zinc-100" />
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {categoryAddons.map(addon => {
                          const isSelected = selectedServices.some(s => s.id === addon.id);
                          return (
                            <button
                              key={addon.id}
                              onClick={() => toggleService(addon)}
                              className="text-left p-5 rounded-2xl border transition-all duration-300 flex justify-between items-center"
                              style={{
                                borderColor: isSelected ? '#D14D72' : '#E4E4E7',
                                backgroundColor: isSelected ? '#fdf2f5' : '#FAFAFA',
                              }}
                            >
                              <div className="flex gap-4 items-center">
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                                  style={{
                                    backgroundColor: isSelected ? '#D14D72' : 'white',
                                    color: isSelected ? 'white' : '#A1A1AA',
                                    border: isSelected ? 'none' : '1px solid #E4E4E7',
                                  }}
                                >
                                  <Plus size={16} />
                                </div>
                                <div>
                                  <h3 className="font-bold text-base leading-tight mb-1 uppercase tracking-tight">{addon.name}</h3>
                                  <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {addon.duration_minutes} МИН</span>
                                    {addon.price > 0 && (
                                      <><span className="w-1 h-1 bg-zinc-200 rounded-full" /><span className="text-zinc-900">{addon.price} ₽</span></>
                                    )}
                                    {addon.price === 0 && <span className="text-zinc-400">Бесплатно</span>}
                                  </div>
                                </div>
                              </div>
                              <div
                                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
                                style={{
                                  borderColor: isSelected ? '#D14D72' : '#E4E4E7',
                                  backgroundColor: isSelected ? '#D14D72' : 'transparent',
                                  color: 'white',
                                }}
                              >
                                {isSelected && <CheckCircle2 size={14} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
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
                  <span className="text-xs font-bold" style={{ color: '#D14D72' }}>{selectedDate?.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                  {[...Array(60)].map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const dateKey = toLocalKey(date);
                    const isWorking = workingDates.has(dateKey);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => isWorking && setSelectedDate(date)}
                        disabled={!isWorking}
                        className="min-w-[70px] aspect-[4/5] flex flex-col items-center justify-center rounded-2xl border transition-all duration-300"
                        style={{
                          backgroundColor: isSelected ? '#D14D72' : isWorking ? 'white' : '#F4F4F5',
                          borderColor: isSelected ? '#D14D72' : isWorking ? 'white' : '#F4F4F5',
                          color: isSelected ? 'white' : isWorking ? '#0A0A0A' : '#A1A1AA',
                          opacity: isWorking || isSelected ? 1 : 0.45,
                          cursor: isWorking ? 'pointer' : 'not-allowed',
                          boxShadow: isSelected ? '0 10px 30px rgba(209,77,114,0.3)' : isWorking ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        <span
                          className="text-[10px] font-black uppercase tracking-tighter mb-1"
                          style={{ color: isSelected ? 'rgba(255,255,255,0.6)' : '#A1A1AA' }}
                        >
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
                        const [startH, startM] = workingHours.start.split(':').map(Number);
                        const [endH, endM] = workingHours.end.split(':').map(Number);
                        const startMins = startH * 60 + startM;
                        const endMins = endH * 60 + endM;
                        for (let mins = startMins; mins < endMins; mins += 30) {
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          times.push(`${h}:${String(m).padStart(2, '0')}`);
                        }
                        return times.map(time => {
                          const isSelected = selectedTime === time;
                          const isAvailable = isSlotAvailable(time);
                          return (
                            <button
                              key={time}
                              disabled={!isAvailable}
                              onClick={() => setSelectedTime(time)}
                              className="py-5 rounded-2xl border font-black text-sm transition-all duration-300"
                              style={{
                                backgroundColor: isSelected ? '#D14D72' : isAvailable ? 'white' : '#F9F9F9',
                                borderColor: isSelected ? '#D14D72' : isAvailable ? 'white' : '#F4F4F5',
                                color: isSelected ? 'white' : isAvailable ? '#0A0A0A' : '#D4D4D8',
                                opacity: isAvailable || isSelected ? 1 : 0.5,
                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                boxShadow: isSelected ? '0 6px 20px rgba(209,77,114,0.25)' : isAvailable ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              }}
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
                  {/* Кнопка входа для незалогиненных */}
                  {authUser === null && (
                    <button
                      type="button"
                      onClick={handleTelegramLogin}
                      className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl border border-zinc-100 bg-white font-black text-sm uppercase tracking-widest text-zinc-600 hover:border-zinc-200 transition-all"
                    >
                      <LogIn size={18} style={{ color: '#D14D72' }} />
                      Войти через Telegram
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 ml-1">— автозаполнение</span>
                    </button>
                  )}

                  {/* Бейдж авторизованного пользователя */}
                  {authUser && (
                    <div className="flex items-center gap-3 px-6 py-4 rounded-3xl border border-zinc-100 bg-white">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ backgroundColor: '#D14D72' }}>
                        {authUser.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black uppercase tracking-widest text-zinc-400">Вы записываетесь как</div>
                        <div className="font-black text-sm uppercase tracking-tight truncate">{authUser.name}</div>
                      </div>
                      <Link href="/login" className="text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-zinc-500 transition-colors flex-shrink-0">
                        Сменить
                      </Link>
                    </div>
                  )}

                  <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 transition-colors" size={20} />
                    <input
                      type="text"
                      required
                      placeholder="Ваше имя"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white pl-16 pr-8 py-6 rounded-3xl border border-zinc-100 font-bold outline-none"
                    />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 transition-colors" size={20} />
                    <input
                      type="tel"
                      required
                      placeholder="+7 (999) 000-00-00"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      className="w-full bg-white pl-16 pr-8 py-6 rounded-3xl border border-zinc-100 font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Promo code */}
                <div className="space-y-3">
                  {promoData ? (
                    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-50 border border-green-100">
                      <Tag size={16} className="text-green-500 flex-shrink-0" />
                      <span className="flex-1 text-sm font-black uppercase tracking-widest text-green-600">
                        {promoInput.toUpperCase()} — скидка {promoData.percent}% ({promoData.discount} ₽)
                      </span>
                      <button onClick={() => { setPromoData(null); setPromoInput(''); }} className="text-green-300 hover:text-green-600">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                        <input
                          type="text"
                          placeholder="Промокод"
                          value={promoInput}
                          onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyPromo())}
                          className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 font-black text-sm uppercase tracking-widest outline-none focus:border-zinc-300"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={promoLoading || !promoInput.trim()}
                        className="px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-zinc-100 text-zinc-500 hover:border-zinc-300 transition-all disabled:opacity-40"
                      >
                        {promoLoading ? '...' : 'Применить'}
                      </button>
                    </div>
                  )}
                  {promoError && <p className="text-red-500 text-xs font-bold px-1">{promoError}</p>}
                </div>

                <div className="bg-[#0A0A0A] text-white p-10 rounded-[3rem] shadow-2xl space-y-10">
                  <div className="flex justify-between items-end border-b border-white/10 pb-8">
                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Итог записи</span>
                    <div className="text-right">
                      {promoData && (
                        <div className="text-zinc-500 text-sm line-through leading-none mb-1">{totalPrice} ₽</div>
                      )}
                      <span className="text-3xl font-black leading-none">{finalPrice} ₽</span>
                      {promoData && (
                        <div className="text-green-400 text-[10px] font-black uppercase tracking-widest mt-1">−{promoData.discount} ₽</div>
                      )}
                    </div>
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
                  {bookingError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-5 py-4 rounded-2xl text-center">
                      {bookingError}
                    </div>
                  )}
                  <button
                    disabled={loading || !formData.name || !formData.phone}
                    type="submit"
                    className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3"
                    style={{ backgroundColor: '#D14D72', color: 'white' }}
                  >
                    {loading
                      ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      : <>ПОДТВЕРДИТЬ <ArrowRight size={18} /></>
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Нижняя плашка */}
      {selectedServices.length > 0 && step < 3 && !success && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-zinc-100 z-40">
          <div className="max-w-4xl mx-auto flex justify-between items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Сумма</span>
              <span className="text-xl font-black">{finalPrice} ₽</span>
            </div>
            <button
              disabled={step === 1 ? selectedServices.length === 0 : !selectedDate || !selectedTime}
              onClick={() => { setBookingError(null); setStep(step + 1); }}
              className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
              style={{ backgroundColor: '#D14D72', color: 'white' }}
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
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-100 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}
