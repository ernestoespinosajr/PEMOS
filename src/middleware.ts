import { type NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { canAccessRoute } from '@/lib/auth/roles';
import type { UserRole } from '@/types/auth';

/**
 * Paths that do not require authentication.
 * Matched against the request pathname.
 */
const PUBLIC_PATHS = [
  '/login',
  '/reset-password',
  '/update-password',
  '/api/auth',
  '/forbidden',
];

/**
 * Checks if a pathname is a public (unauthenticated) path.
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If Supabase is not configured, allow the request through
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  // Skip auth for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Create Supabase client and refresh session tokens
  const { supabase, response } = createMiddlewareClient(request);

  // Verify the user's session -- getUser() makes a server call to validate
  // the JWT, unlike getSession() which only reads the unverified cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No authenticated session -- redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Extract role from JWT custom claims
  // The custom_access_token_hook injects role into the access token claims
  const role = (user.app_metadata?.role as UserRole | undefined) ??
    (user.user_metadata?.role as UserRole | undefined);

  // Check route-level authorization
  if (role && !canAccessRoute(role, pathname)) {
    return NextResponse.redirect(new URL('/forbidden', request.url));
  }

  return response();
}

/**
 * Middleware matcher configuration.
 * Excludes Next.js internals, static files, and public assets.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.svg (app logo)
     * - Public image/asset files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|logo\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
