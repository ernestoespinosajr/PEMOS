import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../../../types/supabase';

/**
 * Creates a Supabase client for server-side usage (Server Components,
 * Server Actions, Route Handlers).
 *
 * Uses `cookies()` from next/headers for read-only cookie access.
 * Token refresh is handled by the middleware -- server components only
 * need to read cookies, not set them.
 *
 * IMPORTANT: This must only be called in server contexts (Server Components,
 * Route Handlers, Server Actions). Never import in client components.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This is expected when the middleware
            // has already refreshed the session. No action needed.
          }
        },
      },
    }
  );
}
