import { supabaseAdmin } from '@/lib/supabase';
import { Hero } from '@/components/client/Hero';
import { ServicesList } from '@/components/client/ServicesList';
import { Camera, MapPin, Phone } from 'lucide-react';

export default async function Home() {
  const { data: services } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return (
    <main className="min-h-screen">
      <Hero />
      
      <ServicesList services={services || []} />

      {/* Contact Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto soft-card p-10 flex flex-col items-center text-center gap-8">
          <h2 className="text-3xl font-bold">Наши контакты</h2>
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 text-xl justify-center">
              <MapPin className="text-primary" />
              <span>Ул. Красоты, 13, Москва</span>
            </div>
            <div className="flex items-center gap-4 text-xl justify-center">
              <Phone className="text-primary" />
              <span>+7 (999) 000-00-00</span>
            </div>
            <div className="flex items-center gap-4 text-xl justify-center">
              <Camera className="text-primary" />
              <span>@beauty_studio_msk</span>
            </div>
          </div>

          <a 
            href="https://t.me/babebar_booking_bot" 
            target="_blank"
            className="mt-4 bg-primary text-white px-10 py-4 text-xl font-bold rounded-[24px] hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            Записаться в Telegram
          </a>
        </div>
      </section>

      <footer className="py-12 px-4 text-center opacity-50 text-sm font-medium">
        <p>&copy; {new Date().getFullYear()} BEAUTY STUDIO. Все права защищены.</p>
      </footer>
    </main>
  );
}
