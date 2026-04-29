import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: { id: string };
}

/**
 * POST /api/admin/users/[id]/reset-password
 *
 * Resets a user's password and clears force_password_change.
 * Body: { new_password: string }
 *
 * Access: admin. Scoped admin (movimiento_id set) can only reset passwords
 * for users within their own movimiento.
 *
 * Response: { success: true }
 */
export async function POST(request: Request, { params }: RouteParams) {
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
    // movimiento_id and tenant_id not in stale generated types — cast to access new columns
    .select('role, movimiento_id, tenant_id' as 'role')
    .eq('auth_user_id', user.id)
    .single();

  const caller = callerRaw as unknown as {
    role: string;
    movimiento_id: string | null;
    tenant_id: string | null;
  } | null;

  if (callerError || !caller || (caller.role !== 'admin' && caller.role !== 'platform_admin')) {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere rol de administrador.' },
      { status: 403 }
    );
  }

  let body: { new_password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido' },
      { status: 400 }
    );
  }

  if (!body.new_password || body.new_password.length < 8) {
    return NextResponse.json(
      { error: 'La nueva contrasena debe tener al menos 8 caracteres' },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Look up the target user to verify tenant isolation, movimiento scope, and get auth_user_id.
  // Platform admins have no tenant_id restriction; tenant admins are scoped to their tenant.
  // Adding .eq('tenant_id', caller.tenant_id) for tenant admins ensures an admin from
  // Tenant A cannot reset passwords for users in Tenant B. If the tenant_id does not match,
  // .single() returns an error and the existing 404 handler below rejects the request.
  let targetQuery = adminClient
    .from('usuarios')
    .select('id, auth_user_id, movimiento_id, tenant_id')
    .eq('id', params.id);

  if (caller.role !== 'platform_admin' && caller.tenant_id) {
    targetQuery = targetQuery.eq('tenant_id', caller.tenant_id);
  }

  const { data: targetUser, error: targetError } = await targetQuery.single();

  if (targetError || !targetUser) {
    return NextResponse.json(
      { error: 'Usuario no encontrado' },
      { status: 404 }
    );
  }

  // Scoped admin can only reset passwords within their movimiento
  if (caller.movimiento_id !== null) {
    const targetUserAny = targetUser as unknown as Record<string, unknown>;
    const targetMovimientoId = targetUserAny.movimiento_id as string | null | undefined;
    if (targetMovimientoId !== caller.movimiento_id) {
      return NextResponse.json(
        { error: 'No autorizado. Solo puede restablecer contrasenas de usuarios en su movimiento.' },
        { status: 403 }
      );
    }
  }

  const targetUserTyped = targetUser as unknown as { auth_user_id: string | null };
  if (!targetUserTyped.auth_user_id) {
    return NextResponse.json(
      { error: 'El usuario no tiene cuenta de autenticacion asociada' },
      { status: 422 }
    );
  }

  // Update password in Supabase Auth
  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
    targetUserTyped.auth_user_id!,
    { password: body.new_password }
  );

  if (authUpdateError) {
    console.error('reset-password auth update error:', authUpdateError);
    return NextResponse.json(
      { error: 'Error al actualizar la contrasena' },
      { status: 500 }
    );
  }

  // Clear the force_password_change flag
  const { error: dbUpdateError } = await adminClient
    .from('usuarios')
    .update({ force_password_change: false } as never)
    .eq('id', params.id);

  if (dbUpdateError) {
    console.error('reset-password db update error:', dbUpdateError);
    return NextResponse.json(
      { error: 'Contrasena actualizada pero no se pudo limpiar el indicador de cambio forzado' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
