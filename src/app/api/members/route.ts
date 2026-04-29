import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateMemberData, PaginationMeta } from '@/types/member';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_TIPO_MIEMBRO = ['coordinador', 'multiplicador', 'relacionado'];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip non-digit characters from a phone number. */
function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9+]/g, '');
  return digits || null;
}

/** Normalize cedula: strip dashes/spaces, return 11 digits or null. */
function normalizeCedula(cedula: string): string | null {
  const digits = cedula.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  return digits;
}

/**
 * Verifies the requesting user is authenticated and returns their
 * tenant_id, usuario record id, role, and movimiento_id.
 */
async function verifyAuth(): Promise<
  | { authorized: true; tenantId: string | null; usuarioId: string; role: string; movimientoId: string | null }
  | { authorized: false; response: NextResponse }
> {
  try {
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
      // movimiento_id is not in stale generated types — cast to access new column
      .select('id, role, tenant_id, movimiento_id' as 'id, role, tenant_id')
      .eq('auth_user_id', user.id)
      .single();

    if (dbError || !dbUser) {
      console.error('verifyAuth: usuarios lookup failed:', dbError?.message ?? 'no row found');
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Usuario no encontrado en el sistema' },
          { status: 403 }
        ),
      };
    }

    const dbUserAny = dbUser as unknown as Record<string, unknown>;
    return {
      authorized: true,
      tenantId: dbUserAny.tenant_id as string | null,
      usuarioId: dbUserAny.id as string,
      role: dbUserAny.role as string,
      movimientoId: (dbUserAny.movimiento_id as string | null | undefined) ?? null,
    };
  } catch (err) {
    console.error('verifyAuth: unexpected error:', err);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Error de autenticacion interno' },
        { status: 500 }
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// GET /api/members
// ---------------------------------------------------------------------------
// List members with filters and pagination.
// Uses the search_members RPC for search queries, or direct queries for
// filter-only requests.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.authorized) {
      return authResult.response;
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const search = searchParams.get('search')?.trim() || null;
    const cedula = searchParams.get('cedula')?.trim() || null;
    const provincia_id = searchParams.get('provincia_id') || null;
    const municipio_id = searchParams.get('municipio_id') || null;
    const circunscripcion_id = searchParams.get('circunscripcion_id') || null;
    const sector_id = searchParams.get('sector_id') || null;
    const tipo_miembro = searchParams.get('tipo_miembro') || null;
    const coordinador_id = searchParams.get('coordinador_id') || null;
    const estadoParam = searchParams.get('estado');
    const page = Math.max(parseInt(searchParams.get('page') || `${DEFAULT_PAGE}`, 10), 1);
    const page_size = Math.min(
      Math.max(parseInt(searchParams.get('page_size') || `${DEFAULT_PAGE_SIZE}`, 10), 1),
      MAX_PAGE_SIZE
    );

    // Validate UUID params
    const uuidParams = { provincia_id, municipio_id, circunscripcion_id, sector_id, coordinador_id };
    for (const [key, val] of Object.entries(uuidParams)) {
      if (val && !UUID_REGEX.test(val)) {
        return NextResponse.json(
          { error: `Parametro "${key}" debe ser un UUID valido` },
          { status: 400 }
        );
      }
    }

    // Validate tipo_miembro
    if (tipo_miembro && !VALID_TIPO_MIEMBRO.includes(tipo_miembro)) {
      return NextResponse.json(
        { error: `tipo_miembro invalido. Debe ser uno de: ${VALID_TIPO_MIEMBRO.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse estado
    let estado: boolean | null = null;
    if (estadoParam === 'true' || estadoParam === 'active') estado = true;
    else if (estadoParam === 'false' || estadoParam === 'inactive') estado = false;

    const offset = (page - 1) * page_size;

    // Use the search_members RPC function
    // Note: Supabase generated types expect `undefined` for omitted params,
    // but PostgREST treats both `null` and `undefined` as SQL NULL.
    // Use `?? undefined` to satisfy the type checker.
    const { data, error } = await supabase.rpc('search_members', {
      p_search: search ?? undefined,
      p_cedula: cedula ?? undefined,
      p_provincia_id: provincia_id ?? undefined,
      p_municipio_id: municipio_id ?? undefined,
      p_circunscripcion_id: circunscripcion_id ?? undefined,
      p_sector_id: sector_id ?? undefined,
      p_tipo_miembro: tipo_miembro ?? undefined,
      p_coordinador_id: coordinador_id ?? undefined,
      p_estado: estado ?? undefined,
      p_limit: page_size,
      p_offset: offset,
    });

    if (error) {
      console.error('Error in search_members RPC:', error);
      return NextResponse.json(
        { error: 'Error al buscar miembros' },
        { status: 500 }
      );
    }

    // Extract total from the first row (all rows have the same total_count)
    const firstRow = data?.[0];
    const total = firstRow ? Number(firstRow.total_count) : 0;
    const total_pages = Math.ceil(total / page_size);

    const meta: PaginationMeta = {
      total,
      page,
      page_size,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
    };

    // Strip total_count from each row before returning
    const members = (data ?? []).map(({ total_count: _total_count, ...rest }) => rest);

    return NextResponse.json({ data: members, meta });
  } catch (err) {
    console.error('GET /api/members unhandled error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/members
// ---------------------------------------------------------------------------
// Create a new member. Validates cedula format, checks for duplicates,
// sanitizes phone numbers.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Only admin, coordinator, and field_worker can create members
    if (authResult.role === 'observer') {
      return NextResponse.json(
        { error: 'No autorizado. Rol de observador no puede crear miembros.' },
        { status: 403 }
      );
    }

    let body: CreateMemberData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud invalido' },
        { status: 400 }
      );
    }

    // Required field validation
    if (!body.cedula || !body.nombre || !body.apellido || !body.tipo_miembro) {
      return NextResponse.json(
        { error: 'Campos requeridos: cedula, nombre, apellido, tipo_miembro' },
        { status: 400 }
      );
    }

    // Validate tipo_miembro
    if (!VALID_TIPO_MIEMBRO.includes(body.tipo_miembro)) {
      return NextResponse.json(
        { error: `tipo_miembro invalido. Debe ser uno de: ${VALID_TIPO_MIEMBRO.join(', ')}` },
        { status: 400 }
      );
    }

    // Normalize and validate cedula
    const normalizedCedula = normalizeCedula(body.cedula);
    if (!normalizedCedula) {
      return NextResponse.json(
        { error: 'Cedula invalida. Debe contener exactamente 11 digitos.' },
        { status: 400 }
      );
    }

    // Validate coordinador_id if provided
    if (body.coordinador_id && !UUID_REGEX.test(body.coordinador_id)) {
      return NextResponse.json(
        { error: 'coordinador_id debe ser un UUID valido' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Formato de correo electronico invalido' },
          { status: 400 }
        );
      }
    }

    const supabase = createClient();

    // Check for duplicate cedula within tenant
    const { data: existing } = await supabase
      .from('miembros')
      .select('id')
      .eq('cedula', normalizedCedula)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un miembro con la cedula ${normalizedCedula} en este tenant` },
        { status: 409 }
      );
    }

    // Build insert data
    const insertData: Record<string, unknown> = {
      cedula: normalizedCedula,
      nombre: body.nombre.trim(),
      apellido: body.apellido.trim(),
      tipo_miembro: body.tipo_miembro,
      tenant_id: authResult.tenantId,
      created_by: authResult.usuarioId,
    };

    // If the caller is scoped to a movimiento, enforce it — the caller cannot
    // override this; their members must belong to their movimiento.
    if (authResult.movimientoId !== null) {
      insertData.movimiento_id = authResult.movimientoId;
    } else if (body.movimiento_id) {
      // Tenant-level admin can explicitly assign a movimiento
      insertData.movimiento_id = body.movimiento_id;
    }

    // Optional string fields
    const stringFields = [
      'apodo', 'sexo', 'fecha_nacimiento', 'ocupacion', 'trabajo',
      'email', 'direccion', 'direccion_actual', 'sector_actual',
      'coordinador_id', 'sector_id', 'comite_id', 'nivel_intermedio_id',
      'recinto_id', 'colegio', 'colegio_ubicacion', 'tipo_movimiento',
    ] as const;

    for (const field of stringFields) {
      const val = body[field as keyof CreateMemberData];
      if (val !== undefined) {
        insertData[field] = typeof val === 'string' ? val.trim() : val;
      }
    }

    // Phone fields: sanitize
    if (body.telefono !== undefined) insertData.telefono = sanitizePhone(body.telefono);
    if (body.celular !== undefined) insertData.celular = sanitizePhone(body.celular);
    if (body.telefono_residencia !== undefined) insertData.telefono_residencia = sanitizePhone(body.telefono_residencia);

    // Boolean fields
    if (body.vinculado !== undefined) insertData.vinculado = body.vinculado;
    if (body.votacion !== undefined) insertData.votacion = body.votacion;

    // JSONB field
    if (body.redes_sociales !== undefined) insertData.redes_sociales = body.redes_sociales;

    const { data: newMember, error } = await supabase
      .from('miembros')
      // Supabase generated types reject Record<string, unknown> for dynamic insert payload — cast to never
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating member:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe un miembro con esta cedula' },
          { status: 409 }
        );
      }

      // Handle FK violation
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Referencia invalida. Verifique coordinador_id, sector_id, u otras relaciones.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error al crear miembro' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newMember }, { status: 201 });
  } catch (err) {
    console.error('POST /api/members unhandled error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
