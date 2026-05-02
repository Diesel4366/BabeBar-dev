'use client';

import { useEffect, useRef } from 'react';

export function TelegramButton({ botUsername }: { botUsername: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !botUsername) return;

    const cleanUsername = botUsername.replace(/^@/, '');
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', cleanUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '16');
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram/callback`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    container.appendChild(script);
  }, [botUsername]);

  return (
    <div className="flex justify-center min-h-[54px]" ref={containerRef} />
  );
}
