import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/movimientos/[id]/miembros
 *
 * Returns paginated members belonging to the specified movimiento.
 * Query params: ?page=1&limit=25
 *
 * Access: admin sees all; scoped users only if the movimiento matches their scope.
 *
 * Response: { miembros: Miembro[], total: number, page: number, limit: number, total_pages: number }
 */
export async function GET(request: Request, { params }: RouteParams) {
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

  // Scoped users can only query their own movimiento
  if (
    authResult.movimientoId !== null &&
    authResult.movimientoId !== params.id
  ) {
    return NextResponse.json(
      { error: 'No autorizado. Solo puede consultar miembros de su movimiento.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? `${DEFAULT_PAGE}`, 10), 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10), 1),
    MAX_LIMIT
  );
  const offset = (page - 1) * limit;

  const supabase = createClient();

  const { data, error, count } = await supabase
    .from('miembros')
    .select('*', { count: 'exact' })
    .eq('movimiento_id', params.id)
    .order('apellido', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('GET /api/movimientos/[id]/miembros error:', error);
    return NextResponse.json(
      { error: 'Error al obtener miembros del movimiento' },
      { status: 500 }
    );
  }

  const total = count ?? 0;
  const total_pages = Math.ceil(total / limit);

  return NextResponse.json({
    miembros: data ?? [],
    total,
    page,
    limit,
    total_pages,
  });
}
