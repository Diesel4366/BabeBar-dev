import { supabaseAdmin } from '@/lib/supabase';
import { Hero } from '@/components/client/Hero';
import { ServicesGrid } from '@/components/client/ServicesGrid';
import { Header } from '@/components/shared/Header';
import { BookingCTA } from '@/components/client/BookingCTA';
import { Camera, MapPin, Phone, Instagram } from 'lucide-react';
import Link from 'next/link';

export default async function Home() {
  const { data: services } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen bg-[#FAFAFA] page-transition">
      <Header />
      
      <Hero />
      
      <ServicesGrid services={services || []} />

      {/* Gallery Section */}
      <section id="gallery" className="py-32 bg-zinc-50 overflow-hidden">
        <div className="container-custom">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">НАШИ <span className="text-primary italic">РАБОТЫ</span></h2>
            <p className="text-zinc-400 font-medium max-w-lg mx-auto uppercase text-[10px] tracking-[0.2em]">Преображение начинается здесь</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-[2rem] border border-zinc-100 flex items-center justify-center group overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                <Camera size={32} className="text-zinc-200 group-hover:scale-110 transition-transform duration-500" />
              </div>
            ))}
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
                  <p className="font-bold text-lg text-[#0A0A0A]">Ул. Красоты, 13, Москва</p>
                </div>
                
                <div className="space-y-2 group">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Phone size={20} />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Телефон</h4>
                  <p className="font-bold text-lg text-[#0A0A0A]">+7 (999) 000-00-00</p>
                </div>

                <div className="space-y-2 group">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Camera size={20} />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Instagram</h4>
                  <p className="font-bold text-lg text-[#0A0A0A]">@babebar_salon</p>
                </div>
              </div>
            </div>

            <BookingCTA />
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-zinc-100 bg-white">
        <div className="container-custom flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-2xl font-black tracking-tighter">
            BABE<span className="text-primary italic">BAR</span>
          </div>
          <div className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} Modern Beauty Studio
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <Link href="#" className="hover:text-[#0A0A0A] transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-[#0A0A0A] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
