import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/auth';

/**
 * Verifies the requesting user has admin role.
 */
async function verifyAdmin(): Promise<
  | { authorized: true }
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
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (dbError || !dbUser || dbUser.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true };
}

/**
 * PATCH /api/admin/users/[id]
 *
 * Updates a user's profile, role, geographic scope, or status.
 * Requires admin role.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = params;

  let body: {
    nombre?: string;
    apellido?: string;
    role?: UserRole;
    estado?: boolean;
    provincia_id?: string | null;
    municipio_id?: string | null;
    circunscripcion_id?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido' },
      { status: 400 }
    );
  }

  // Validate role if provided
  if (body.role !== undefined) {
    const validRoles: UserRole[] = ['admin', 'coordinator', 'observer', 'field_worker'];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json(
        { error: 'Rol invalido' },
        { status: 400 }
      );
    }
  }

  const adminClient = createAdminClient();

  // Build the update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (body.nombre !== undefined) updateData.nombre = body.nombre;
  if (body.apellido !== undefined) updateData.apellido = body.apellido;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.estado !== undefined) updateData.estado = body.estado;
  if (body.provincia_id !== undefined) updateData.provincia_id = body.provincia_id;
  if (body.municipio_id !== undefined) updateData.municipio_id = body.municipio_id;
  if (body.circunscripcion_id !== undefined) updateData.circunscripcion_id = body.circunscripcion_id;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No se proporcionaron campos para actualizar' },
      { status: 400 }
    );
  }

  const { data: updatedUser, error } = await adminClient
    .from('usuarios')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);

    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }

  // If role was updated, also update the auth user metadata so the
  // custom_access_token_hook picks it up on next token refresh.
  if (body.role !== undefined && updatedUser.auth_user_id) {
    await adminClient.auth.admin.updateUserById(updatedUser.auth_user_id, {
      user_metadata: { role: body.role },
    });
  }

  return NextResponse.json({ user: updatedUser });
}

/**
 * DELETE /api/admin/users/[id]
 *
 * Soft-deletes a user by setting estado = false (inactivo).
 * Does not remove the auth user from Supabase Auth.
 * Requires admin role.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = params;
  const adminClient = createAdminClient();

  const { data: updatedUser, error } = await adminClient
    .from('usuarios')
    .update({ estado: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error deactivating user:', error);

    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error al desactivar usuario' },
      { status: 500 }
    );
  }

  return NextResponse.json({ user: updatedUser });
}
