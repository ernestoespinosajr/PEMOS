import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/auth';

/**
 * Verifies the requesting user has admin role.
 * Returns the user's tenant_id if authorized, or a NextResponse error.
 */
async function verifyAdmin(): Promise<
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

  // Get the user's role from the usuarios table
  const { data: dbUser, error: dbError } = await supabase
    .from('usuarios')
    .select('role, tenant_id')
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

  return { authorized: true, tenantId: dbUser.tenant_id };
}

/**
 * GET /api/admin/users
 *
 * Fetches all users from the usuarios table with resolved geographic names.
 * Requires admin role.
 */
export async function GET() {
  const authResult = await verifyAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const adminClient = createAdminClient();

  // Scope the query to the calling admin's tenant so that service-role access
  // via adminClient does not inadvertently return users from other tenants.
  // verifyAdmin() already validates the caller is admin and returns their tenantId.
  const usersQuery = adminClient
    .from('usuarios')
    .select(
      `
      id,
      auth_user_id,
      nombre,
      apellido,
      email,
      role,
      estado,
      provincia_id,
      municipio_id,
      circunscripcion_id,
      tenant_id,
      created_at,
      provincias ( nombre ),
      municipios ( nombre ),
      circunscripciones ( nombre )
    `
    )
    .order('created_at', { ascending: false });

  // platform_admin has no tenant_id; all other admins must be scoped to their tenant
  if (authResult.tenantId) {
    usersQuery.eq('tenant_id', authResult.tenantId);
  }

  const { data: users, error } = await usersQuery;

  if (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }

  // Flatten the joined geographic names into the user objects
  const flatUsers = (users ?? []).map((user) => {
    const provincia = user.provincias as { nombre: string } | null;
    const municipio = user.municipios as { nombre: string } | null;
    const circunscripcion = user.circunscripciones as {
      nombre: string;
    } | null;

    return {
      id: user.id,
      auth_user_id: user.auth_user_id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      role: user.role,
      estado: user.estado,
      provincia_id: user.provincia_id,
      municipio_id: user.municipio_id,
      circunscripcion_id: user.circunscripcion_id,
      tenant_id: user.tenant_id,
      created_at: user.created_at,
      provincia_nombre: provincia?.nombre ?? null,
      municipio_nombre: municipio?.nombre ?? null,
      circunscripcion_nombre: circunscripcion?.nombre ?? null,
    };
  });

  return NextResponse.json({ users: flatUsers });
}

/**
 * POST /api/admin/users
 *
 * Creates a new user:
 * 1. Creates auth user in Supabase Auth
 * 2. Inserts record into the usuarios table
 *
 * Requires admin role.
 */
export async function POST(request: Request) {
  const authResult = await verifyAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  let body: {
    nombre?: string;
    apellido?: string;
    email?: string;
    password?: string;
    temp_password?: string;
    role?: UserRole;
    provincia_id?: string | null;
    municipio_id?: string | null;
    circunscripcion_id?: string | null;
    movimiento_id?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido' },
      { status: 400 }
    );
  }

  const {
    nombre,
    apellido,
    email,
    password,
    temp_password,
    role,
    provincia_id,
    municipio_id,
    circunscripcion_id,
    movimiento_id,
  } = body;

  // temp_password takes precedence over password when provided
  const resolvedPassword = temp_password ?? password;

  // Validate required fields
  if (!nombre || !apellido || !email || !resolvedPassword || !role) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: nombre, apellido, email, password (o temp_password), role' },
      { status: 400 }
    );
  }

  // Validate role
  const validRoles: UserRole[] = ['admin', 'supervisor', 'coordinator', 'observer', 'field_worker'];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: 'Rol invalido' },
      { status: 400 }
    );
  }

  // Validate password length
  if (resolvedPassword.length < 8) {
    return NextResponse.json(
      { error: 'La contrasena debe tener al menos 8 caracteres' },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Step 1: Create auth user
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password: resolvedPassword,
      email_confirm: true,
      user_metadata: { role },
    });

  if (authError) {
    console.error('Error creating auth user:', authError);

    // Handle duplicate email
    if (authError.message?.includes('already been registered')) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este correo electronico' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: `Error al crear usuario de autenticacion: ${authError.message}` },
      { status: 500 }
    );
  }

  // Step 2: Insert into usuarios table
  const { data: newUser, error: insertError } = await adminClient
    .from('usuarios')
    // Supabase generated types are stale (missing new columns) — cast to never
    .insert({
      nombre,
      apellido,
      email,
      role,
      auth_user_id: authData.user.id,
      tenant_id: authResult.tenantId,
      provincia_id: provincia_id ?? null,
      municipio_id: municipio_id ?? null,
      circunscripcion_id: circunscripcion_id ?? null,
      movimiento_id: movimiento_id ?? null,
      force_password_change: temp_password !== undefined,
    } as never)
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting usuario:', insertError);

    // Attempt to clean up the auth user if DB insert fails
    await adminClient.auth.admin.deleteUser(authData.user.id);

    return NextResponse.json(
      { error: 'Error al crear registro de usuario en la base de datos' },
      { status: 500 }
    );
  }

  return NextResponse.json({ user: newUser }, { status: 201 });
}
