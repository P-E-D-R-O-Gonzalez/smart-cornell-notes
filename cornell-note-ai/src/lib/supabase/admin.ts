import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

/**
 * Server-only client. This key bypasses RLS, so every query using it must
 * explicitly scope data to the Clerk user authenticated by the route handler.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  // Supabase's current dashboard labels the server-only credential a "secret key".
  // Support both the established service-role variable and that descriptive name.
  const serviceRoleKey =
    process.env.SERVICE_ROLE;

  if (!serviceRoleKey) {
    throw new Error('Missing a Supabase key.');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
