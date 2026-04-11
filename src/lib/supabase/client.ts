import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../../types/supabase';

/**
 * Creates a Supabase client for browser (client component) usage.
 *
 * Uses `createBrowserClient` from @supabase/ssr which automatically
 * manages cookies via `document.cookie` and caches the client as a
 * singleton to prevent multiple instances.
 *
 * Safe to call in any client component -- the singleton pattern ensures
 * only one GoTrueClient is active at a time.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
