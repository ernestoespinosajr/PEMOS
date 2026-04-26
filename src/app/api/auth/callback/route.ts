import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/callback
 *
 * OAuth and magic link callback handler. Supabase redirects here after
 * a successful external authentication. This route exchanges the
 * authorization code for a session and redirects the user.
 *
 * Query params:
 *   - code: Authorization code from Supabase Auth
 *   - next: (optional) URL to redirect to after authentication, defaults to "/"
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error -- redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
