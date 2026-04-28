'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Service } from '@/types';

interface BookingContextType {
  selectedServices: Service[];
  toggleService: (service: Service) => void;
  clearServices: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedTime: string | null;
  setSelectedTime: (time: string | null) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const clearServices = () => {
    setSelectedServices([]);
    setCurrentStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  return (
    <BookingContext.Provider value={{
      selectedServices,
      toggleService,
      clearServices,
      isDrawerOpen,
      setIsDrawerOpen,
      currentStep,
      setCurrentStep,
      selectedDate,
      setSelectedDate,
      selectedTime,
      setSelectedTime
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
