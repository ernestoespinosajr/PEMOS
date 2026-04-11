import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// POST /api/seguimiento/convert
// ---------------------------------------------------------------------------
// Convert a registered unregistered voter into a full party member.
// Uses the convert_seguimiento_to_member() RPC function to ensure both the
// member creation and seguimiento update happen atomically in a single
// database transaction.
//
// Body: {
//   seguimiento_id: string (required),
//   tipo_miembro: string (required -- 'coordinador' | 'multiplicador' | 'relacionado'),
//   sector_id?: string,
//   recinto_id?: string,
//   additional fields...
// }

export async function POST(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'Solo administradores y coordinadores pueden convertir a miembros.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const seguimiento_id = body.seguimiento_id as string | undefined;
  const tipo_miembro = body.tipo_miembro as string | undefined;

  if (!seguimiento_id || !UUID_REGEX.test(seguimiento_id)) {
    return NextResponse.json(
      { error: 'seguimiento_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!tipo_miembro || !['coordinador', 'multiplicador', 'relacionado'].includes(tipo_miembro)) {
    return NextResponse.json(
      { error: 'tipo_miembro es requerido (coordinador, multiplicador, o relacionado)' },
      { status: 400 }
    );
  }

  // Validate optional UUID fields
  const optionalUuidFields = ['sector_id', 'comite_id', 'nivel_intermedio_id', 'coordinador_id', 'recinto_id'];
  for (const field of optionalUuidFields) {
    if (body[field] !== undefined && body[field] !== null) {
      if (typeof body[field] !== 'string' || !UUID_REGEX.test(body[field] as string)) {
        return NextResponse.json(
          { error: `${field} debe ser un UUID valido` },
          { status: 400 }
        );
      }
    }
  }

  const supabase = createClient();

  // Build member data JSONB payload for the RPC function.
  // Note: tenant_id is NOT passed here -- the RPC function derives it from
  // the caller's JWT via get_my_tenant_id() for security (prevents cross-tenant writes).
  const memberData: Record<string, string | null | undefined> = {
    tipo_miembro,
  };

  // Pass through optional overrides
  const passThroughFields = [
    'nombre', 'apellido', 'telefono', 'celular', 'email',
    'direccion', 'sexo', 'sector_id', 'comite_id',
    'nivel_intermedio_id', 'coordinador_id', 'recinto_id', 'colegio',
  ];
  for (const field of passThroughFields) {
    if (body[field] !== undefined) {
      memberData[field] = body[field] as string;
    }
  }

  // Call the atomic RPC function
  const { data, error } = await supabase.rpc('convert_seguimiento_to_member', {
    p_seguimiento_id: seguimiento_id,
    p_member_data: memberData as Record<string, string>,
  });

  if (error) {
    console.error('Error in convert_seguimiento_to_member RPC:', error);

    // Map PostgreSQL error codes to HTTP responses
    if (error.code === 'P0002') {
      // no_data_found
      return NextResponse.json(
        { error: 'Registro de seguimiento no encontrado' },
        { status: 404 }
      );
    }
    if (error.code === 'P0001' || error.message?.includes('ya fue convertido')) {
      return NextResponse.json(
        { error: 'Este registro ya fue convertido a miembro' },
        { status: 409 }
      );
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un miembro con esta cedula' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error al convertir seguimiento a miembro' },
      { status: 500 }
    );
  }

  const memberId = data as string;

  return NextResponse.json(
    {
      data: {
        miembro_id: memberId,
        seguimiento_id,
        message: 'Miembro creado exitosamente desde seguimiento',
      },
    },
    { status: 201 }
  );
}
