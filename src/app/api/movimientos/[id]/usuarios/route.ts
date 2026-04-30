import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/movimientos/[id]/usuarios
 *
 * Returns users assigned to the specified movimiento.
 * Access: admin sees all; scoped users only if the movimiento matches their scope.
 *
 * Response: { usuarios: UsuarioRow[], total: number }
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) {
    return authResult.response;
  }

  if (!UUID_REGEX.test(params.id)) {
    return NextResponse.json(
      { error: 'ID de movimiento invalido' },
      { status: 400 }
    );
  }

  if (
    authResult.movimientoId !== null &&
    authResult.movimientoId !== params.id
  ) {
    return NextResponse.json(
      { error: 'No autorizado. Solo puede consultar usuarios de su movimiento.' },
      { status: 403 }
    );
  }

  const supabase = createClient();

  // movimiento_id is not in stale generated types — cast column names to bypass type checks
  const { data, error, count } = await supabase
    .from('usuarios')
    .select(
      'id, nombre, apellido, email, role, estado' as const,
      { count: 'exact' }
    )
    .eq('movimiento_id' as 'id', params.id as never)
    .order('apellido', { ascending: true });

  if (error) {
    console.error('GET /api/movimientos/[id]/usuarios error:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios del movimiento' },
      { status: 500 }
    );
  }

  return NextResponse.json({ usuarios: data ?? [], total: count ?? 0 });
}
