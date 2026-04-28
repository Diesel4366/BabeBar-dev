import { supabaseAdmin } from '@/lib/supabase';
import { Hero } from '@/components/client/Hero';
import { ServicesGrid } from '@/components/client/ServicesGrid';
import { Header } from '@/components/shared/Header';
import { Camera, MapPin, Phone } from 'lucide-react';

export default async function Home() {
  const { data: services } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <Header />
      
      <Hero />
      
      <ServicesGrid services={services || []} />

      {/* Modern Contact Section */}
      <section id="contacts" className="py-24 bg-zinc-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                МЫ ВСЕГДА <br/> <span className="text-primary italic text-3xl md:text-5xl">НА СВЯЗИ</span>
              </h2>
              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-zinc-100 shadow-sm shrink-0">
                    <MapPin className="text-primary" size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Адрес</h4>
                    <p className="text-xl font-bold text-[#0A0A0A]">Ул. Красоты, 13, Москва</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-zinc-100 shadow-sm shrink-0">
                    <Phone className="text-primary" size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Телефон</h4>
                    <p className="text-xl font-bold text-[#0A0A0A]">+7 (999) 000-00-00</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-zinc-100 shadow-sm shrink-0">
                    <Camera className="text-primary" size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Instagram</h4>
                    <p className="text-xl font-bold text-[#0A0A0A]">@babebar_salon</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 md:p-16 rounded-[3rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 text-center">
              <h3 className="text-3xl font-black mb-6">Готовы преобразиться?</h3>
              <p className="text-zinc-500 mb-10 font-medium">
                Запишитесь через наш Telegram-бот — это самый быстрый способ выбрать мастера и время.
              </p>
              <a 
                href="https://t.me/babebar_booking_bot" 
                target="_blank"
                className="btn-primary inline-flex items-center gap-3 text-lg py-5 px-12"
              >
                ЗАПИСАТЬСЯ ОНЛАЙН
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-zinc-100 bg-white">
        <div className="container-custom flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-lg font-black tracking-tighter">
            BABE<span className="text-primary italic">BAR</span>
          </div>
          <div className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} BEAUTY STUDIO. ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-6 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <a href="#" className="hover:text-[#0A0A0A]">Privacy</a>
            <a href="#" className="hover:text-[#0A0A0A]">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
