import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

export function createServerClient() {
  const { url, key } = getSupabaseEnv();
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
