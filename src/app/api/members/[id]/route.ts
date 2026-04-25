import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateMemberData } from '@/types/member';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_TIPO_MIEMBRO = ['coordinador', 'multiplicador', 'relacionado'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9+]/g, '');
  return digits || null;
}

function normalizeCedula(cedula: string): string | null {
  const digits = cedula.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  return digits;
}

async function verifyAuth(): Promise<
  | { authorized: true; tenantId: string | null; usuarioId: string; role: string }
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
      .select('id, role, tenant_id')
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

    return {
      authorized: true,
      tenantId: dbUser.tenant_id,
      usuarioId: dbUser.id,
      role: dbUser.role,
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
// GET /api/members/[id]
// ---------------------------------------------------------------------------
// Get a single member with resolved coordinator and geographic names.
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { id } = params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'ID de miembro invalido' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: member, error } = await supabase
      .from('miembros')
      .select(`
        *,
        coordinador:coordinador_id (
          id, nombre, apellido, cedula
        ),
        sectores (
          id, nombre,
          circunscripciones (
            id, nombre,
            municipios (
              id, nombre,
              provincias ( id, nombre )
            )
          )
        ),
        recintos ( id, nombre )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching member:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Miembro no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Error al obtener miembro' },
        { status: 500 }
      );
    }

    // Flatten resolved names -- defensive access to handle both object and array shapes.
    // PostgREST with !fk_name hint returns a single object for many-to-one,
    // but the generated types may define it as an array. Handle both cases.
    type CoordShape = { id: string; nombre: string; apellido: string; cedula: string };
    const rawCoord = member.coordinador as unknown;
    const coordinador: CoordShape | null = Array.isArray(rawCoord)
      ? (rawCoord[0] as CoordShape | undefined) ?? null
      : (rawCoord as CoordShape | null);

    type SectorShape = {
      id: string; nombre: string;
      circunscripciones: {
        id: string; nombre: string;
        municipios: {
          id: string; nombre: string;
          provincias: { id: string; nombre: string } | null;
        } | null;
      } | null;
    };
    const rawSector = member.sectores as unknown;
    const sector: SectorShape | null = Array.isArray(rawSector)
      ? (rawSector[0] as SectorShape | undefined) ?? null
      : (rawSector as SectorShape | null);

    type RecintoShape = { id: string; nombre: string };
    const rawRecinto = member.recintos as unknown;
    const recinto: RecintoShape | null = Array.isArray(rawRecinto)
      ? (rawRecinto[0] as RecintoShape | undefined) ?? null
      : (rawRecinto as RecintoShape | null);

    // Build the flat detail object -- spread member first, then override nested
    // properties with flattened names
    const { coordinador: _c, sectores: _s, recintos: _r, ...memberBase } = member as Record<string, unknown>;

    const detail = {
      ...memberBase,
      coordinador_nombre: coordinador
        ? `${coordinador.nombre} ${coordinador.apellido}`
        : null,
      coordinador_apellido: coordinador?.apellido ?? null,
      coordinador_cedula: coordinador?.cedula ?? null,
      sector_nombre: sector?.nombre ?? null,
      circunscripcion_nombre: sector?.circunscripciones?.nombre ?? null,
      municipio_nombre: sector?.circunscripciones?.municipios?.nombre ?? null,
      provincia_nombre:
        sector?.circunscripciones?.municipios?.provincias?.nombre ?? null,
      recinto_nombre: recinto?.nombre ?? null,
    };

    return NextResponse.json({ data: detail });
  } catch (err) {
    console.error('GET /api/members/[id] unhandled error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/members/[id]
// ---------------------------------------------------------------------------
// Update member fields. Only provided fields are updated.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.authorized) {
      return authResult.response;
    }

    if (authResult.role === 'observer') {
      return NextResponse.json(
        { error: 'No autorizado. Rol de observador no puede actualizar miembros.' },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'ID de miembro invalido' },
        { status: 400 }
      );
    }

    let body: UpdateMemberData;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud invalido' },
        { status: 400 }
      );
    }

    // Validate cedula if provided
    if (body.cedula !== undefined) {
      const normalizedCedula = normalizeCedula(body.cedula);
      if (!normalizedCedula) {
        return NextResponse.json(
          { error: 'Cedula invalida. Debe contener exactamente 11 digitos.' },
          { status: 400 }
        );
      }
      body.cedula = normalizedCedula;
    }

    // Validate tipo_miembro if provided
    if (body.tipo_miembro && !VALID_TIPO_MIEMBRO.includes(body.tipo_miembro)) {
      return NextResponse.json(
        { error: `tipo_miembro invalido. Debe ser uno de: ${VALID_TIPO_MIEMBRO.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (body.email) {
      const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Formato de correo electronico invalido' },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    // String fields
    const stringFields = [
      'cedula', 'nombre', 'apellido', 'apodo', 'sexo', 'fecha_nacimiento',
      'ocupacion', 'trabajo', 'email', 'direccion', 'direccion_actual',
      'sector_actual', 'tipo_miembro', 'coordinador_id', 'sector_id',
      'comite_id', 'nivel_intermedio_id', 'recinto_id', 'colegio',
      'colegio_ubicacion', 'movimiento_id', 'tipo_movimiento', 'foto_url',
    ] as const;

    for (const field of stringFields) {
      const val = body[field as keyof UpdateMemberData];
      if (val !== undefined) {
        updateData[field] = typeof val === 'string' ? val.trim() : val;
      }
    }

    // Phone fields: sanitize
    if (body.telefono !== undefined) updateData.telefono = sanitizePhone(body.telefono);
    if (body.celular !== undefined) updateData.celular = sanitizePhone(body.celular);
    if (body.telefono_residencia !== undefined) updateData.telefono_residencia = sanitizePhone(body.telefono_residencia);

    // Boolean fields
    if (body.estado !== undefined) updateData.estado = body.estado;
    if (body.vinculado !== undefined) updateData.vinculado = body.vinculado;
    if (body.votacion !== undefined) updateData.votacion = body.votacion;

    // JSONB
    if (body.redes_sociales !== undefined) updateData.redes_sociales = body.redes_sociales;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: updatedMember, error } = await supabase
      .from('miembros')
      // Supabase generated types reject Record<string, unknown> for dynamic update payload — cast to never
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Miembro no encontrado' },
          { status: 404 }
        );
      }

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe un miembro con esta cedula' },
          { status: 409 }
        );
      }

      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Referencia invalida. Verifique coordinador_id, sector_id, u otras relaciones.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error al actualizar miembro' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedMember });
  } catch (err) {
    console.error('PATCH /api/members/[id] unhandled error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/members/[id]
// ---------------------------------------------------------------------------
// Soft delete: sets estado = false. Does not remove the record.
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Only admin and coordinator can deactivate members
    if (authResult.role !== 'admin' && authResult.role !== 'coordinator') {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador o coordinador.' },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'ID de miembro invalido' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: updatedMember, error } = await supabase
      .from('miembros')
      .update({ estado: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating member:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Miembro no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Error al desactivar miembro' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedMember });
  } catch (err) {
    console.error('DELETE /api/members/[id] unhandled error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
