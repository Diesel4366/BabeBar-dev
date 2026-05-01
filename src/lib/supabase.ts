import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

// Для использования в клиентских компонентах
export const createClientClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('Supabase credentials missing, client-side requests will fail');
    return null as any;
  }
  
  return createBrowserClient(url, key);
};

// Для использования в серверных функциях (обходит RLS)
const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

export const supabaseAdmin = createClient(adminUrl, adminKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
