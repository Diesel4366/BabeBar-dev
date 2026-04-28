import { supabaseAdmin } from '@/lib/supabase';
import { Hero } from '@/components/client/Hero';
import { ServicesList } from '@/components/client/ServicesList';
import { Header } from '@/components/shared/Header';
import { Camera, MapPin, Phone } from 'lucide-react';

export default async function Home() {
  const { data: services } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen">
      <Header />
      
      <div className="pt-20">
        <Hero />
      </div>
      
      <div id="services">
        <ServicesList services={services || []} />
      </div>

      {/* Contact Section */}
      <section id="contacts" className="py-24 px-4">
        <div className="max-w-3xl mx-auto soft-card p-12 flex flex-col items-center text-center gap-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Наши контакты</h2>
            <div className="w-12 h-1 bg-primary mx-auto rounded-full" />
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 text-xl justify-center font-medium">
              <MapPin className="text-primary" />
              <span>Ул. Красоты, 13, Москва</span>
            </div>
            <div className="flex items-center gap-4 text-xl justify-center font-medium">
              <Phone className="text-primary" />
              <span>+7 (999) 000-00-00</span>
            </div>
            <div className="flex items-center gap-4 text-xl justify-center font-medium">
              <Camera className="text-primary" />
              <span>@beauty_studio_msk</span>
            </div>
          </div>

          <a 
            href="https://t.me/babebar_booking_bot" 
            target="_blank"
            className="mt-4 bg-primary text-white px-12 py-5 text-xl font-bold rounded-[24px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
          >
            Записаться в Telegram
          </a>
        </div>
      </section>

      <footer className="py-16 px-4 text-center opacity-40 text-sm font-bold tracking-widest uppercase">
        <p>&copy; {new Date().getFullYear()} BEAUTY STUDIO. ВСЕ ПРАВА ЗАЩИЩЕНЫ.</p>
      </footer>
    </main>
  );
}
