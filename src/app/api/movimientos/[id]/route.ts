import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { MovimientoFormData } from '@/types/movimiento';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/movimientos/[id]
 *
 * Returns a single movimiento by ID.
 * RLS ensures callers can only access movimientos within their scope.
 *
 * Response: { movimiento: Movimiento }
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

  const supabase = createClient();

  // movimientos table is not in stale generated types — cast table name to bypass type check
  const { data, error } = await supabase
    .from('movimientos' as 'usuarios')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }
    console.error('GET /api/movimientos/[id] error:', error);
    return NextResponse.json(
      { error: 'Error al obtener movimiento' },
      { status: 500 }
    );
  }

  return NextResponse.json({ movimiento: data });
}

/**
 * PUT /api/movimientos/[id]
 *
 * Updates a movimiento.
 * Only tenant-level admin (movimiento_id is null) can update.
 *
 * Response: { movimiento: Movimiento }
 */
export async function PUT(request: Request, { params }: RouteParams) {
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

  if (authResult.role !== 'admin' && authResult.role !== 'platform_admin') {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere rol de administrador.' },
      { status: 403 }
    );
  }

  if (authResult.movimientoId !== null) {
    return NextResponse.json(
      { error: 'No autorizado. Solo administradores de nivel tenant pueden modificar movimientos.' },
      { status: 403 }
    );
  }

  let body: Partial<MovimientoFormData>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido' },
      { status: 400 }
    );
  }

  if (body.nombre !== undefined && !body.nombre.trim()) {
    return NextResponse.json(
      { error: 'El campo nombre no puede estar vacio' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // movimientos table is not in stale generated types — cast table name to bypass type check
  const { data, error } = await supabase
    .from('movimientos' as 'usuarios')
    .update(body as never)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }
    console.error('PUT /api/movimientos/[id] error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar movimiento' },
      { status: 500 }
    );
  }

  return NextResponse.json({ movimiento: data });
}

/**
 * DELETE /api/movimientos/[id]
 *
 * Deletes a movimiento. Returns 409 if the movimiento has active members.
 * Only tenant-level admin can delete.
 *
 * Response: { success: true }
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
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

  if (authResult.role !== 'admin' && authResult.role !== 'platform_admin') {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere rol de administrador.' },
      { status: 403 }
    );
  }

  if (authResult.movimientoId !== null) {
    return NextResponse.json(
      { error: 'Solo el administrador principal puede eliminar organizaciones.' },
      { status: 403 }
    );
  }

  const supabase = createClient();

  // Guard: refuse deletion if movimiento has active members
  const { count: memberCount, error: countError } = await supabase
    .from('miembros')
    .select('id', { count: 'exact', head: true })
    .eq('movimiento_id', params.id)
    .eq('estado', true);

  if (countError) {
    console.error('DELETE /api/movimientos/[id] member count error:', countError);
    return NextResponse.json(
      { error: 'Error al verificar miembros del movimiento' },
      { status: 500 }
    );
  }

  if ((memberCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar un movimiento con miembros activos', member_count: memberCount },
      { status: 409 }
    );
  }

  // movimientos table is not in stale generated types — cast table name to bypass type check
  const { error } = await supabase
    .from('movimientos' as 'usuarios')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('DELETE /api/movimientos/[id] error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar movimiento' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
