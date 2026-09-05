import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

let supabaseClient: SupabaseClient | undefined;

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { url, key } = getSupabaseEnv();
  supabaseClient = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return supabaseClient;
}
