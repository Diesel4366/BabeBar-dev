import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BABEBAR — Студия красоты',
    short_name: 'BABEBAR',
    description: 'Онлайн-запись в студию красоты. Нижний Новгород.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: '#D14D72',
    orientation: 'portrait',
    icons: [
      { src: '/api/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/api/icons/512', sizes: '512x512', type: 'image/png' },
      { src: '/api/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
