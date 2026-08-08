import { supabaseAdmin } from './supabase';
import { SITE_CONFIG } from './config';

export interface SiteSettings {
  address: string;
  phone: string;
  instagram: string;
  instagram_url: string;
  master_name: string;
}

const FALLBACK: SiteSettings = {
  address: SITE_CONFIG.address,
  phone: SITE_CONFIG.phone,
  instagram: SITE_CONFIG.instagram,
  instagram_url: SITE_CONFIG.instagramUrl,
  master_name: SITE_CONFIG.masterName,
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час
let _cache: SiteSettings | null = null;
let _cacheAt = 0;

export async function getSettings(): Promise<SiteSettings> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) return _cache;
  try {
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('key, value');
    if (error || !data) return FALLBACK;
    const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
    _cache = {
      address:       map.address       || FALLBACK.address,
      phone:         map.phone         || FALLBACK.phone,
      instagram:     map.instagram     || FALLBACK.instagram,
      instagram_url: map.instagram_url || FALLBACK.instagram_url,
      master_name:   map.master_name   || FALLBACK.master_name,
    };
    _cacheAt = Date.now();
    return _cache;
  } catch {
    return FALLBACK;
  }
}
