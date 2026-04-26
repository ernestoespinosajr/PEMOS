import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { BulkAction } from '@/types/member';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_ACTIONS: BulkAction[] = [
  'assign_coordinator',
  'change_status',
  'assign_geographic',
];

const MAX_BULK_IDS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyAuth(): Promise<
  | { authorized: true; tenantId: string | null; usuarioId: string; role: string }
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
    .select('id, role, tenant_id')
    .eq('auth_user_id', user.id)
    .single();

  if (dbError || !dbUser) {
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
}

// ---------------------------------------------------------------------------
// POST /api/members/bulk
// ---------------------------------------------------------------------------
// Bulk operations on multiple members.
// Body: { member_ids: string[], action: BulkAction, value: any }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const authResult = await verifyAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }

  // Only admin and coordinator can perform bulk operations
  if (authResult.role !== 'admin' && authResult.role !== 'coordinator') {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere rol de administrador o coordinador.' },
      { status: 403 }
    );
  }

  let body: {
    member_ids?: string[];
    action?: BulkAction;
    value?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido' },
      { status: 400 }
    );
  }

  const { member_ids, action, value } = body;

  // Validate member_ids
  if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
    return NextResponse.json(
      { error: 'Se requiere un arreglo no vacio de member_ids' },
      { status: 400 }
    );
  }

  if (member_ids.length > MAX_BULK_IDS) {
    return NextResponse.json(
      { error: `Maximo ${MAX_BULK_IDS} miembros por operacion masiva` },
      { status: 400 }
    );
  }

  // Validate all IDs are UUIDs
  for (const id of member_ids) {
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: `ID invalido: ${id}` },
        { status: 400 }
      );
    }
  }

  // Validate action
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Accion invalida. Debe ser una de: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 }
    );
  }

  if (value === undefined || value === null) {
    return NextResponse.json(
      { error: 'Se requiere un valor para la operacion' },
      { status: 400 }
    );
  }

  const supabase = createClient();
  let updateData: Record<string, unknown> = {};

  switch (action) {
    case 'assign_coordinator': {
      if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
        return NextResponse.json(
          { error: 'Para assign_coordinator, value debe ser un UUID valido del coordinador' },
          { status: 400 }
        );
      }

      // Verify the coordinator exists and is actually a coordinator
      const { data: coord, error: coordError } = await supabase
        .from('miembros')
        .select('id, tipo_miembro')
        .eq('id', value)
        .maybeSingle();

      if (coordError || !coord) {
        return NextResponse.json(
          { error: 'Coordinador no encontrado' },
          { status: 404 }
        );
      }

      if (coord.tipo_miembro !== 'coordinador' && coord.tipo_miembro !== 'multiplicador') {
        return NextResponse.json(
          { error: 'El miembro seleccionado no es coordinador ni multiplicador' },
          { status: 400 }
        );
      }

      updateData = { coordinador_id: value };
      break;
    }

    case 'change_status': {
      if (typeof value !== 'boolean') {
        return NextResponse.json(
          { error: 'Para change_status, value debe ser true o false' },
          { status: 400 }
        );
      }
      updateData = { estado: value };
      break;
    }

    case 'assign_geographic': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        return NextResponse.json(
          { error: 'Para assign_geographic, value debe ser un objeto con sector_id, comite_id, o nivel_intermedio_id' },
          { status: 400 }
        );
      }

      const geoValue = value as Record<string, string>;
      const validGeoFields = ['sector_id', 'comite_id', 'nivel_intermedio_id'];
      const geoUpdate: Record<string, string> = {};

      for (const [key, val] of Object.entries(geoValue)) {
        if (!validGeoFields.includes(key)) {
          return NextResponse.json(
            { error: `Campo geografico invalido: ${key}` },
            { status: 400 }
          );
        }
        if (val && !UUID_REGEX.test(val)) {
          return NextResponse.json(
            { error: `${key} debe ser un UUID valido` },
            { status: 400 }
          );
        }
        geoUpdate[key] = val;
      }

      if (Object.keys(geoUpdate).length === 0) {
        return NextResponse.json(
          { error: 'Se requiere al menos un campo geografico' },
          { status: 400 }
        );
      }

      updateData = geoUpdate;
      break;
    }
  }

  // Perform the bulk update
  const { data: updated, error: updateError } = await supabase
    .from('miembros')
    // Supabase generated types reject Record<string, unknown> for dynamic update payload — cast to never
    .update(updateData as never)
    .in('id', member_ids)
    .select('id');

  if (updateError) {
    console.error('Error in bulk update:', updateError);

    if (updateError.code === '23503') {
      return NextResponse.json(
        { error: 'Referencia invalida en la actualizacion masiva' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al realizar la operacion masiva' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    updated: updated?.length ?? 0,
    action,
  });
}
