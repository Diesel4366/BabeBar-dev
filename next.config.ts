import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lrnajodxfwegimnwnbdd.supabase.co' },
      { protocol: 'https', hostname: 'foomerisayo.beget.app' },
      { protocol: 'https', hostname: 'api.babebar.ru' },
    ],
  },
};

export default nextConfig;
