import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyAuth(): Promise<
  | { authorized: true; tenantId: string | null }
  | { authorized: false; response: NextResponse }
> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      ),
    };
  }

  const { data: dbUser, error: dbError } = await supabase
    .from('usuarios')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .single();

  if (dbError || !dbUser) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Usuario no encontrado en el sistema' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, tenantId: dbUser.tenant_id };
}

// ---------------------------------------------------------------------------
// GET /api/members/coordinadores
// ---------------------------------------------------------------------------
// List all coordinators (tipo_miembro = 'coordinador') with their
// multiplicador count. Uses the get_coordinadores RPC function.
// ---------------------------------------------------------------------------
export async function GET() {
  const authResult = await verifyAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_coordinadores', {
    p_tenant_id: authResult.tenantId,
  });

  if (error) {
    console.error('Error in get_coordinadores RPC:', error);
    return NextResponse.json(
      { error: 'Error al obtener coordinadores' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: data ?? [],
    meta: { count: data?.length ?? 0 },
  });
}
