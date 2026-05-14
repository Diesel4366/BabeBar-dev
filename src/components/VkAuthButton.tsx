'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    VKIDSDK: any;
  }
}

export default function VkAuthButton({ state }: { state?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js';
    script.async = true;
    script.onload = () => {
      if (!window.VKIDSDK || !containerRef.current) return;
      const VKID = window.VKIDSDK;

      VKID.Config.init({
        app: Number(process.env.NEXT_PUBLIC_VK_APP_ID) || 54589669,
        redirectUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://babe-bar.vercel.app',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '',
      });

      const oneTap = new VKID.OneTap();
      oneTap
        .render({ container: containerRef.current, showAlternativeLogin: true })
        .on(VKID.WidgetEvents.ERROR, console.error)
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload: { code: string; device_id: string }) => {
          try {
            const tokens = await VKID.Auth.exchangeCode(payload.code, payload.device_id);
            const res = await fetch('/api/auth/vk/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: tokens.access_token,
                state: state ?? '',
              }),
            });
            if (!res.ok) { router.push('/login?error=vk_session'); return; }
            const { redirectTo } = await res.json();
            router.push(redirectTo ?? '/profile');
          } catch {
            router.push('/login?error=vk_exchange');
          }
        });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [router, state]);

  return <div ref={containerRef} className="w-full" />;
}
