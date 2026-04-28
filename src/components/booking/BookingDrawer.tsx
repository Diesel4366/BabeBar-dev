'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBooking } from '@/context/BookingContext';
import { X, ChevronLeft, Clock, Calendar, CheckCircle2, Phone, User, Trash2 } from 'lucide-react';

export const BookingDrawer: React.FC = () => {
  const { 
    isDrawerOpen, 
    setIsDrawerOpen, 
    selectedServices, 
    toggleService,
    currentStep,
    setCurrentStep,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime
  } = useBooking();

  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Вычисляем общую стоимость и время
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const handleClose = () => {
    setIsDrawerOpen(false);
    if (success) {
      // Сброс формы после успешной записи
      setTimeout(() => {
        setSuccess(false);
        setCurrentStep(1);
      }, 500);
    }
  };

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || selectedServices.length === 0) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          date: selectedDate.toISOString(),
          time: selectedTime,
          services: selectedServices,
          totalPrice
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        alert('Ошибка при записи: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Произошла ошибка при отправке данных. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (!isDrawerOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Drawer Content */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {currentStep > 1 && !success && (
                <button 
                  onClick={prevStep}
                  className="p-2 hover:bg-zinc-50 rounded-full transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {success ? 'Успешно!' : 'Онлайн запись'}
              </h2>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 hover:bg-zinc-50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Steps Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!success ? (
              <>
                {/* Step 1: Review Services */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest">Выбранные услуги</h3>
                      <span className="text-xs font-bold text-primary bg-pink-50 px-2 py-1 rounded">
                        {selectedServices.length}
                      </span>
                    </div>

                    {selectedServices.length > 0 ? (
                      <div className="space-y-3">
                        {selectedServices.map(service => (
                          <div key={service.id} className="flex justify-between items-center p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50">
                            <div>
                              <div className="font-bold text-sm">{service.name}</div>
                              <div className="text-[10px] text-zinc-400 font-bold uppercase">{service.duration_minutes} мин</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="font-black text-sm">{service.price} ₽</div>
                              <button 
                                onClick={() => toggleService(service)}
                                className="text-zinc-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-zinc-400 text-sm mb-4">Вы еще не выбрали ни одной услуги</p>
                        <button 
                          onClick={handleClose}
                          className="text-primary font-bold text-sm underline underline-offset-4"
                        >
                          Вернуться к списку
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Date & Time */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest mb-4">Выберите дату</h3>
                      {/* Упрощенный выбор даты для начала */}
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map(offset => {
                          const date = new Date();
                          date.setDate(date.getDate() + offset);
                          const isActive = selectedDate?.toDateString() === date.toDateString();
                          return (
                            <button
                              key={offset}
                              onClick={() => setSelectedDate(date)}
                              className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                                isActive 
                                  ? 'border-primary bg-pink-50 text-primary shadow-sm' 
                                  : 'border-zinc-100 hover:border-zinc-300'
                              }`}
                            >
                              <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">
                                {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                              </span>
                              <span className="text-sm font-black">{date.getDate()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedDate && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest mb-4">Выберите время</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00'].map(time => {
                            const isActive = selectedTime === time;
                            return (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                  isActive 
                                    ? 'border-primary bg-pink-50 text-primary shadow-sm' 
                                    : 'border-zinc-100 hover:border-zinc-300'
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Step 3: Contact Info */}
                {currentStep === 3 && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest">Ваши контакты</h3>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input
                          type="text"
                          required
                          placeholder="Ваше имя"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 focus:outline-none focus:border-primary transition-colors text-sm font-medium"
                        />
                      </div>
                      
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input
                          type="tel"
                          required
                          placeholder="+7 (___) ___-__-__"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 focus:outline-none focus:border-primary transition-colors text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100 space-y-3">
                      <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase">
                        <span>Итого</span>
                        <span>{selectedServices.length} услуги</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-2xl font-black">{totalPrice} ₽</span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                            <Clock size={10} /> {totalDuration} мин
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase block">Дата и время</span>
                          <span className="text-xs font-bold">
                            {selectedDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, {selectedTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle2 size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2">Вы записаны!</h3>
                  <p className="text-zinc-500 text-sm max-w-[240px] mx-auto">
                    Мы отправили подтверждение вам в Telegram и скоро свяжемся.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="btn-primary w-full max-w-[200px]"
                >
                  ОТЛИЧНО
                </button>
              </motion.div>
            )}
          </div>

          {/* Footer Navigation */}
          {!success && (
            <div className="p-6 border-t border-zinc-100 bg-white">
              {currentStep === 1 && (
                <button
                  disabled={selectedServices.length === 0}
                  onClick={nextStep}
                  className="btn-primary w-full disabled:opacity-50 disabled:grayscale transition-all py-4 uppercase tracking-widest text-[10px]"
                >
                  ВЫБРАТЬ ВРЕМЯ
                </button>
              )}
              {currentStep === 2 && (
                <button
                  disabled={!selectedDate || !selectedTime}
                  onClick={nextStep}
                  className="btn-primary w-full disabled:opacity-50 disabled:grayscale transition-all py-4 uppercase tracking-widest text-[10px]"
                >
                  ПОДТВЕРДИТЬ ДАННЫЕ
                </button>
              )}
              {currentStep === 3 && (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.name || !formData.phone}
                  className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-3 py-4 uppercase tracking-widest text-[10px]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'ЗАПИСАТЬСЯ'
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
