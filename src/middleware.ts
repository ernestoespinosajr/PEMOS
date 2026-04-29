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
  '/suspended',
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

  // Extract role from JWT custom claims.
  // The custom_access_token_hook injects 'app_role' (NOT 'role') into the JWT.
  // The JWT 'role' claim must stay 'authenticated' for PostgREST.
  // To read custom JWT claims, we decode the access token from the session.
  let role: UserRole | undefined;
  let tenantSuspended = false;
  let forcePasswordChange = false;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    try {
      // Decode JWT payload (base64url) without verification — Supabase
      // already validated the token via getUser() above.
      const parts = session.access_token.split('.');
      const payloadBase64 = parts[1] ?? '';
      const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const claims = JSON.parse(payloadJson);
      role = claims.app_role as UserRole | undefined;
      tenantSuspended = claims.tenant_suspended === true;
      forcePasswordChange = claims.force_password_change === true;
    } catch {
      // If JWT decode fails, role stays undefined — route auth will be skipped
      // but data access is still protected by RLS at the database level.
    }
  }

  // Check if tenant is suspended
  // The custom_access_token_hook sets tenant_suspended: true when tenants.activo = false
  // Platform admins are exempt -- they operate at the platform level and must retain
  // access even when their associated tenant (if any) is suspended.
  if (tenantSuspended && role !== 'platform_admin') {
    return NextResponse.redirect(new URL('/suspended', request.url));
  }

  // Force password change: redirect to update-password page before anything else.
  // Applies to all authenticated users except when already on the update-password path.
  if (forcePasswordChange && pathname !== '/update-password') {
    return NextResponse.redirect(new URL('/update-password?forced=true', request.url));
  }

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
