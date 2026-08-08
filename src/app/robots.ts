import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/profile', '/booking/success'],
    },
    sitemap: 'https://babebar.ru/sitemap.xml',
  };
}
