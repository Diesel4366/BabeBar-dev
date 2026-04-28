import { supabaseAdmin } from '@/lib/supabase';
import { Hero } from '@/components/client/Hero';
import { ServicesGrid } from '@/components/client/ServicesGrid';
import { Marquee } from '@/components/ui/Marquee';
import { Gallery } from '@/components/client/Gallery';
import { MagneticButton } from '@/components/ui/MagneticButton';
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
      
      <Marquee 
        text="МАНИКЮР • УКЛАДКИ • МАКИЯЖ • БРОВИ • ПЕРМАНЕНТ • BABEBAR STYLE • " 
        velocity={30} 
      />

      <ServicesGrid services={services || []} />

      <Marquee 
        text="ТВОЯ КРАСОТА — НАШИ ПРАВИЛА • " 
        velocity={40} 
        className="bg-white text-black"
        outline
      />

      <Gallery />

      {/* Final CTA / Contact */}
      <section className="py-24 px-4 bg-black">
        <div className="max-w-7xl mx-auto border-t border-white/10 pt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-7xl md:text-9xl font-black leading-none mb-12">
                ГОТОВА <br/>
                <span className="text-primary italic font-display">СИЯТЬ?</span>
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-xl">
                  <MapPin className="text-primary" />
                  <span>Ул. Красоты, 13, Москва</span>
                </div>
                <div className="flex items-center gap-4 text-xl">
                  <Phone className="text-primary" />
                  <span>+7 (999) 000-00-00</span>
                </div>
                <div className="flex items-center gap-4 text-xl">
                  <Camera className="text-primary" />
                  <span>@babebar_salon</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end justify-center">
              <MagneticButton
                href="https://t.me/babebar_booking_bot"
                target="_blank"
                className="w-64 h-64 md:w-80 md:h-80 bg-primary text-black rounded-full flex flex-col items-center justify-center text-center p-8 hover:bg-white transition-colors duration-500"
              >
                <span className="text-3xl md:text-4xl font-black leading-tight">
                  ЗАБРОНИРОВАТЬ <br/> СЕЙЧАС
                </span>
              </MagneticButton>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-white/5 text-center bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-50 text-sm uppercase tracking-widest font-bold">
          <p>&copy; {new Date().getFullYear()} BABEBAR SALON</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Cookies</a>
          </div>
          <p>DESIGNED BY AI AGENTS</p>
        </div>
      </footer>
    </main>
  );
}
