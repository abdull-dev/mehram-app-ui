import 'react-native-url-polyfill/auto';

/**
 * Supabase client
 *
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values:
 *   Supabase dashboard → Settings → API → Project URL / anon public key
 *
 * Auth note: this app manages its own JWT tokens via the REST backend.
 * Supabase auth features are disabled — we only use Realtime.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://vlxzogcasqdmzqfibxzw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pq26lY5770pl-_m_0LDsDg_CAvoJ66k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:    false,
    autoRefreshToken:  false,
    detectSessionInUrl: false,
  },
});
