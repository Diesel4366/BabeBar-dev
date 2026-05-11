import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://babebar.ru'),
  title: {
    default: 'BABEBAR — Студия красоты в Нижнем Новгороде',
    template: '%s | BABEBAR',
  },
  description: 'Онлайн-запись в студию красоты BABEBAR. Наращивание ресниц, оформление бровей, макияж. Нижний Новгород, ул. Сазанова 2А. +7 (999) 120-21-12.',
  keywords: ['студия красоты', 'наращивание ресниц', 'оформление бровей', 'макияж', 'Нижний Новгород', 'BabeBar', 'запись онлайн', 'babe bar'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://babebar.ru',
    siteName: 'BABEBAR',
    title: 'BABEBAR — Студия красоты в Нижнем Новгороде',
    description: 'Онлайн-запись в студию красоты. Наращивание ресниц, оформление бровей, макияж.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'BABEBAR — Студия красоты' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BABEBAR — Студия красоты',
    description: 'Онлайн-запись. Нижний Новгород.',
    images: ['/og-image.jpg'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
        {children}
      </body>
    </html>
  );
}
