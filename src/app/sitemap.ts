import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://babebar.ru';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/services`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/services/narashchivanie-resnic`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/services/oformlenie-brovey`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/services/makiyazh`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/booking`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];
}
