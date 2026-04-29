import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { MovimientoFormData } from '@/types/movimiento';

/**
 * GET /api/movimientos
 *
 * Returns all movimientos for the caller's tenant.
 * RLS handles scoping: admin sees all; scoped users see only their own.
 *
 * Response: { movimientos: Movimiento[], total: number }
 */
export async function GET() {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) {
    return authResult.response;
  }

  const supabase = createClient();

  // movimientos table is not in stale generated types — cast table name to bypass type check
  const { data, error, count } = await supabase
    .from('movimientos' as 'usuarios')
    .select('*', { count: 'exact' })
    .order('nombre', { ascending: true });

  if (error) {
    console.error('GET /api/movimientos error:', error);
    return NextResponse.json(
      { error: 'Error al obtener movimientos' },
      { status: 500 }
    );
  }

  return NextResponse.json({ movimientos: data ?? [], total: count ?? 0 });
}

/**
 * POST /api/movimientos
 *
 * Creates a new movimiento for the caller's tenant.
 * Only tenant-level admin (no movimiento_id in their profile) can create.
 *
 * Response: { movimiento: Movimiento }
 */
export async function POST(request: Request) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) {
    return authResult.response;
  }

  if (authResult.role !== 'admin' && authResult.role !== 'platform_admin') {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere rol de administrador.' },
      { status: 403 }
    );
  }

  if (authResult.movimientoId !== null) {
    return NextResponse.json(
      { error: 'No autorizado. Administradores con scope de movimiento no pueden crear movimientos.' },
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

  if (!body.nombre?.trim()) {
    return NextResponse.json(
      { error: 'El campo nombre es requerido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // movimientos table is not in stale generated types — cast table name to bypass type check
  const { data, error } = await supabase
    .from('movimientos' as 'usuarios')
    .insert({
      ...body,
      nombre: body.nombre.trim(),
      tenant_id: authResult.tenantId,
    } as never)
    .select()
    .single();

  if (error) {
    console.error('POST /api/movimientos error:', error);
    return NextResponse.json(
      { error: 'Error al crear movimiento' },
      { status: 500 }
    );
  }

  // Cast the newly created movimiento row to access its id
  const newMovimiento = data as unknown as Record<string, unknown>;

  // Auto-register the representante as a coordinador member when provided
  if (body.representante_nombre?.trim()) {
    const fullName = body.representante_nombre.trim();
    const lastSpaceIdx = fullName.lastIndexOf(' ');
    const miembroNombre = lastSpaceIdx > 0 ? fullName.slice(0, lastSpaceIdx) : fullName;
    const miembroApellido = lastSpaceIdx > 0 ? fullName.slice(lastSpaceIdx + 1) : '';

    const miembroInsert: Record<string, unknown> = {
      tenant_id: authResult.tenantId,
      movimiento_id: newMovimiento.id,
      nombre: miembroNombre,
      apellido: miembroApellido,
      tipo_miembro: 'coordinador',
    };

    if (body.representante_cedula) miembroInsert.cedula = body.representante_cedula;
    if (body.representante_cargo) miembroInsert.cargo = body.representante_cargo;
    if (body.representante_telefono) miembroInsert.telefono = body.representante_telefono;
    if (body.representante_email) miembroInsert.email = body.representante_email;

    const { error: miembroError } = await supabase
      .from('miembros' as never)
      .insert(miembroInsert as never);

    if (miembroError) {
      console.error('POST /api/movimientos: error inserting representante as miembro:', miembroError);
      // Non-fatal: movimiento was created successfully; continue
    }

    // Auto-create a scoped admin user account when an email is provided
    if (body.representante_email) {
      try {
        const adminClient = createAdminClient();
        const tempPassword = crypto.randomUUID();

        const { data: authUserData, error: authUserError } =
          await adminClient.auth.admin.createUser({
            email: body.representante_email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { role: 'admin' },
          });

        if (authUserError) {
          console.error(
            'POST /api/movimientos: error creating auth user for representante:',
            authUserError
          );
        } else {
          const { error: usuarioError } = await adminClient
            .from('usuarios' as never)
            .insert({
              nombre: miembroNombre,
              apellido: miembroApellido,
              email: body.representante_email,
              role: 'admin',
              auth_user_id: authUserData.user.id,
              tenant_id: authResult.tenantId,
              movimiento_id: newMovimiento.id,
              force_password_change: true,
            } as never);

          if (usuarioError) {
            console.error(
              'POST /api/movimientos: error inserting usuario for representante:',
              usuarioError
            );
            // Best-effort cleanup of orphaned auth user
            await adminClient.auth.admin.deleteUser(authUserData.user.id);
          }
        }
      } catch (userErr) {
        console.error(
          'POST /api/movimientos: unexpected error creating representante user account:',
          userErr
        );
        // Non-fatal: do not fail the movimiento creation
      }
    }
  }

  return NextResponse.json({ movimiento: data }, { status: 201 });
}
