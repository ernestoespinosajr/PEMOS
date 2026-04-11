import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Result type when authentication/authorization fails.
 */
interface AuthFailure {
  authorized: false;
  response: NextResponse;
}

/**
 * Result type when authentication succeeds.
 * `partidoId` is derived from the active electoral period, if one exists.
 */
interface AuthSuccess {
  authorized: true;
  tenantId: string | null;
  partidoId: string | null;
  role: string;
  authUserId: string;
}

export type AuthResult = AuthFailure | AuthSuccess;

interface VerifyAuthOptions {
  /**
   * Whether to look up the active periodo electoral and derive partidoId.
   * Defaults to true. Set to false for routes that do not need it.
   */
  includePartido?: boolean;
}

/**
 * Shared authentication and authorization helper for API routes.
 *
 * Verifies:
 * 1. The request has a valid Supabase auth session (getUser)
 * 2. The auth user has a corresponding row in the `usuarios` table
 * 3. (Optional) Derives `partidoId` from the active electoral period
 *
 * Returns an AuthSuccess or AuthFailure discriminated union.
 *
 * Usage:
 * ```ts
 * const authResult = await verifyApiAuth();
 * if (!authResult.authorized) return authResult.response;
 * // authResult is now typed as AuthSuccess
 * ```
 */
export async function verifyApiAuth(
  options: VerifyAuthOptions = {}
): Promise<AuthResult> {
  const { includePartido = true } = options;

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    };
  }

  const { data: dbUser, error: dbError } = await supabase
    .from('usuarios')
    .select('id, role, tenant_id')
    .eq('auth_user_id', user.id)
    .single();

  if (dbError || !dbUser) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Usuario no encontrado en el sistema' },
        { status: 403 }
      ),
    };
  }

  // Optionally derive partido_id from the active periodo electoral
  let partidoId: string | null = null;
  if (includePartido) {
    const { data: activePeriodo } = await supabase
      .from('periodos_electorales')
      .select('partido_id')
      .eq('activo', true)
      .eq('estado', true)
      .limit(1)
      .maybeSingle();
    if (activePeriodo) {
      partidoId = activePeriodo.partido_id;
    }
  }

  return {
    authorized: true as const,
    tenantId: dbUser.tenant_id as string | null,
    partidoId,
    role: dbUser.role as string,
    authUserId: user.id,
  };
}
