import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: { id: string };
}

/**
 * PATCH /api/admin/users/[id]/movimiento
 *
 * Assigns or removes a user's movimiento membership.
 * Body: { movimiento_id: string | null }  (null = return to main org)
 *
 * Access: tenant-level admin ONLY — scoped admins cannot reassign users
 * between movimientos. This prevents privilege escalation.
 *
 * Response: { user: Usuario }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  if (!UUID_REGEX.test(params.id)) {
    return NextResponse.json(
      { error: 'ID de usuario invalido' },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: callerRaw, error: callerError } = await supabase
    .from('usuarios')
    // movimiento_id not in stale generated types — cast to access new column
    .select('role, movimiento_id' as 'role')
    .eq('auth_user_id', user.id)
    .single();

  const caller = callerRaw as unknown as { role: string; movimiento_id: string | null } | null;

  if (callerError || !caller || (caller.role !== 'admin' && caller.role !== 'platform_admin')) {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere rol de administrador.' },
      { status: 403 }
    );
  }

  // Only tenant-level admin (no movimiento_id) can reassign users
  if (caller.movimiento_id !== null) {
    return NextResponse.json(
      { error: 'No autorizado. Solo administradores de nivel tenant pueden reasignar movimientos.' },
      { status: 403 }
    );
  }

  let body: { movimiento_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido' },
      { status: 400 }
    );
  }

  if (!('movimiento_id' in body)) {
    return NextResponse.json(
      { error: 'Se requiere el campo movimiento_id (puede ser null para remover del movimiento)' },
      { status: 400 }
    );
  }

  // Validate movimiento_id if not null
  if (body.movimiento_id !== null && body.movimiento_id !== undefined) {
    if (!UUID_REGEX.test(body.movimiento_id)) {
      return NextResponse.json(
        { error: 'movimiento_id debe ser un UUID valido o null' },
        { status: 400 }
      );
    }
  }

  const adminClient = createAdminClient();

  const { data: updatedUser, error } = await adminClient
    .from('usuarios')
    .update({ movimiento_id: body.movimiento_id ?? null } as never)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // FK violation: movimiento_id references a non-existent movimiento
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'El movimiento especificado no existe' },
        { status: 400 }
      );
    }

    console.error('PATCH /api/admin/users/[id]/movimiento error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar movimiento del usuario' },
      { status: 500 }
    );
  }

  return NextResponse.json({ user: updatedUser });
}
