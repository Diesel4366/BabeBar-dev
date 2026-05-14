import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get('state') ?? '';

  const headersList = await headers();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    ?? (() => {
      const host = headersList.get('host') ?? 'babe-bar.vercel.app';
      const proto = host.includes('localhost') ? 'http' : 'https';
      return `${proto}://${host}`;
    })();
  const redirectUri = `${siteUrl}/api/auth/vk/callback`;

  const params = new URLSearchParams({
    client_id: process.env.VK_APP_ID!,
    redirect_uri: redirectUri,
    scope: '4194304', // phone
    response_type: 'code',
    v: '5.131',
    display: 'page',
    ...(state ? { state } : {}),
  });

  return NextResponse.redirect(`https://oauth.vk.com/authorize?${params}`);
}
