import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '../../../types/supabase';

/**
 * Creates a Supabase client configured for Next.js middleware.
 *
 * This client handles session refresh by reading and writing cookies
 * on both the request and response objects. The returned `response`
 * must be used as the middleware return value so that updated cookies
 * (refreshed tokens) are sent to the browser.
 *
 * @param request - The incoming Next.js middleware request
 * @returns Object with `supabase` client and `response` to return from middleware
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // Recreate the response with updated request headers
          response = NextResponse.next({
            request,
          });

          // Set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, response: () => response };
}
