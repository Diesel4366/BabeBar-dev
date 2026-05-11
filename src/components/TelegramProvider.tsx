'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function TelegramProvider() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Запускаем только внутри Telegram
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    // Инициализация
    tg.ready();
    tg.expand();

    // Цвет хедера и фона
    tg.setHeaderColor('#D14D72');
    tg.setBackgroundColor('#FAFAFA');

    // Кнопка "Назад" в Telegram вместо браузерной
    const handleBackButton = () => {
      if (pathname !== '/') {
        router.back();
      } else {
        tg.close();
      }
    };

    if (pathname !== '/') {
      tg.BackButton.show();
    } else {
      tg.BackButton.hide();
    }

    tg.BackButton.onClick(handleBackButton);

    return () => {
      tg.BackButton.offClick(handleBackButton);
    };
  }, [pathname, router]);

  return null;
}
