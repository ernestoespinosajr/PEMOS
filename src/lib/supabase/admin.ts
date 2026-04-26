import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase';

/**
 * !! WARNING: SERVICE ROLE CLIENT !!
 *
 * This client bypasses Row Level Security (RLS) and has full access to
 * all data. It must NEVER be imported in client components or exposed
 * to the browser.
 *
 * Use cases:
 * - Server-side admin operations (user management, data seeding)
 * - Background jobs / cron tasks
 * - Webhook handlers that need unrestricted access
 * - Operations that require bypassing RLS policies
 *
 * For normal server-side operations that should respect RLS, use the
 * server client from `@/lib/supabase/server` instead.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
        'The admin client requires the service role key which should only be available on the server.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
