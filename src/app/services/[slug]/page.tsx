import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { Header } from '@/components/shared/Header';
import { ServicesGrid } from '@/components/client/ServicesGrid';
import { BookingCTA } from '@/components/client/BookingCTA';
import { ChevronRight } from 'lucide-react';

export const revalidate = 3600;

const SEO_CONFIG: Record<string, {
  category: string;
  h1: string;
  title: string;
  description: string;
  keywords: string;
}> = {
  'narashchivanie-resnic': {
    category: 'Ресницы',
    h1: 'Наращивание ресниц',
    title: 'Наращивание ресниц в Нижнем Новгороде — BABEBAR',
    description: 'Профессиональное наращивание ресниц в Нижнем Новгороде. Классика, объём 2D–5D, Голливуд. Ул. Сазанова 2А. Запись онлайн.',
    keywords: 'наращивание ресниц нижний новгород, наращивание ресниц нн, объём ресниц, классическое наращивание',
  },
  'oformlenie-brovey': {
    category: 'Брови',
    h1: 'Оформление бровей',
    title: 'Оформление бровей в Нижнем Новгороде — BABEBAR',
    description: 'Коррекция и окрашивание бровей хной и краской, долговременная укладка, БОТОКС. Нижний Новгород, ул. Сазанова 2А. Запись онлайн.',
    keywords: 'оформление бровей нижний новгород, коррекция бровей нн, долговременная укладка бровей, окрашивание бровей хной',
  },
  'makiyazh': {
    category: 'Макияж',
    h1: 'Профессиональный макияж',
    title: 'Профессиональный макияж в Нижнем Новгороде — BABEBAR',
    description: 'Свадебный, вечерний, дневной и яркий макияж. Мастер-визажист в Нижнем Новгороде. Ул. Сазанова 2А. Запись онлайн.',
    keywords: 'макияж нижний новгород, свадебный макияж нн, вечерний макияж, визажист нижний новгород',
  },
};

export async function generateStaticParams() {
  return Object.keys(SEO_CONFIG).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const config = SEO_CONFIG[slug];
  if (!config) return {};
  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    alternates: { canonical: `https://babebar.ru/services/${slug}` },
    openGraph: {
      images: [{ url: 'https://babebar.ru/og-image.jpg', width: 1200, height: 630, alt: config.title }],
      title: config.title,
      description: config.description,
      url: `https://babebar.ru/services/${slug}`,
      siteName: 'BABEBAR',
      locale: 'ru_RU',
      type: 'website',
    },
  };
}

export default async function ServiceCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = SEO_CONFIG[slug];
  if (!config) notFound();

  const { data: services } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('is_active', true)
    .eq('category', config.category)
    .order('price', { ascending: true });

  const mainServices = (services ?? []).filter(s => !s.is_addon);

  return (
    <main className="min-h-screen bg-[#FAFAFA] page-transition">
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-16 bg-white">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-10">
            <Link href="/" className="hover:text-primary transition-colors">Главная</Link>
            <ChevronRight size={12} />
            <Link href="/#services" className="hover:text-primary transition-colors">Услуги</Link>
            <ChevronRight size={12} />
            <span className="text-zinc-600">{config.category}</span>
          </nav>

          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] mb-8">
            {config.h1} <br />
            <span className="text-primary italic">в Нижнем Новгороде</span>
          </h1>
          <p className="text-zinc-400 text-lg font-medium max-w-xl">
            {config.description}
          </p>
        </div>
      </section>

      {/* Services */}
      <ServicesGrid services={mainServices} />

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="container-custom max-w-2xl">
          <BookingCTA />
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: config.h1,
            provider: {
              '@type': 'BeautySalon',
              name: 'BABEBAR',
              url: 'https://babebar.ru',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'ул. Сазанова 2А',
                addressLocality: 'Нижний Новгород',
                addressCountry: 'RU',
              },
            },
            areaServed: 'Нижний Новгород',
            url: `https://babebar.ru/services/${slug}`,
            offers: mainServices.map(s => ({
              '@type': 'Offer',
              name: s.name,
              price: s.price,
              priceCurrency: 'RUB',
            })),
          }),
        }}
      />
    </main>
  );
}
