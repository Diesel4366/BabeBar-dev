import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'BABEBAR — Студия красоты в Нижнем Новгороде',
    description: 'Запишитесь онлайн на наращивание ресниц, оформление бровей или макияж. Нижний Новгород, ул. Сазанова 2А. Работаем ежедневно.',
    alternates: { canonical: 'https://babebar.ru' },
  };
}

import { Hero } from '@/components/client/Hero';
import { ServicesGrid } from '@/components/client/ServicesGrid';
import { Header } from '@/components/shared/Header';
import { BookingCTA } from '@/components/client/BookingCTA';
import { Advantages } from '@/components/client/Advantages';
import { SITE_CONFIG } from '@/lib/config';
import { getSettings } from '@/lib/settings';
import { MapPin, Phone, Camera } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const galleryImages = [
  { src: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80', alt: 'Работа мастера — наращивание ресниц' },
  { src: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=600&q=80', alt: 'Работа мастера — макияж' },
  { src: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=600&q=80', alt: 'Работа мастера — уход за кожей' },
  { src: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=600&q=80', alt: 'Работа мастера — оформление бровей' },
];

export default async function Home() {
  const [{ data: services }, settings] = await Promise.all([
    supabaseAdmin.from('services').select('*').eq('is_active', true).order('created_at', { ascending: true }),
    getSettings(),
  ]);

  return (
    <main className="min-h-screen bg-[#FAFAFA] page-transition">
      <Header />
      
      <Hero />
      
      <ServicesGrid services={services || []} />

      <Advantages />

      {/* Gallery Section */}
      <section id="gallery" className="py-32 bg-zinc-50 overflow-hidden">
        <div className="container-custom">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">НАШИ <span className="text-primary italic">РАБОТЫ</span></h2>
            <p className="text-zinc-400 font-medium max-w-lg mx-auto uppercase text-[10px] tracking-[0.2em]">Преображение начинается здесь</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryImages.map((item, i) => (
              <Link
                key={i}
                href={settings.instagram_url}
                target="_blank"
                aria-label={item.alt}
                className="aspect-[3/4] rounded-[2rem] overflow-hidden relative group"
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                  <span className="text-white text-[10px] font-bold uppercase tracking-widest">В Instagram</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              href={settings.instagram_url}
              target="_blank"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-primary transition-colors"
            >
              Больше в Instagram 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Contact Section */}
      <section id="contacts" className="py-32 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div className="space-y-6">
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85]">
                  МЫ ВСЕГДА <br/> <span className="text-primary italic">НА СВЯЗИ</span>
                </h2>
                <p className="text-zinc-400 font-medium text-lg max-w-md">Готовы ответить на любые вопросы и подобрать идеальное время для вашего визита.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2 group">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <MapPin size={20} />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Адрес студии</h4>
                  <p className="font-bold text-lg text-[#0A0A0A]">{settings.address}</p>
                </div>

                <div className="space-y-2 group">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Phone size={20} />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Телефон</h4>
                  <p className="font-bold text-lg text-[#0A0A0A]">{settings.phone}</p>
                </div>

                <div className="space-y-2 group">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Camera size={20} />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Instagram</h4>
                  <p className="font-bold text-lg text-[#0A0A0A]">{settings.instagram}</p>
                </div>
              </div>
            </div>

            <BookingCTA />
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BeautySalon',
          name: 'BABEBAR',
          description: 'Студия красоты. Наращивание ресниц, оформление бровей, макияж.',
          url: 'https://babebar.ru',
          telephone: settings.phone,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'ул. Сазанова 2А',
            addressLocality: 'Нижний Новгород',
            addressCountry: 'RU',
          },
          sameAs: [settings.instagram_url],
          priceRange: '₽₽',
          openingHours: 'Mo-Su 10:00-21:00',
        })}}
      />

      <footer className="py-12 border-t border-zinc-100 bg-white">
        <div className="container-custom flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-2xl font-black tracking-tighter">
            BABE<span className="text-primary italic">BAR</span>
          </div>
          <div className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} {settings.master_name}
          </div>
          <Link
            href={settings.instagram_url}
            target="_blank"
            className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors"
          >
            {settings.instagram}
          </Link>
        </div>
      </footer>
    </main>
  );
}
