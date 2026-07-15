import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      // 20 second timeout for slow connections
      const timer = setTimeout(() => controller.abort(), 20000);
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
    },
  },
  db: { schema: 'public' },
  auth: { persistSession: false },
});

export type { SupabaseClient } from '@supabase/supabase-js';
