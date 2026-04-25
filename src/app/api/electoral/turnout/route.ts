import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/electoral/turnout
// ---------------------------------------------------------------------------
// Get members at a recinto with their votacion status.
// Query params: recinto_id (required)

export async function GET(request: Request) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const recinto_id = searchParams.get('recinto_id');

  if (!recinto_id || !UUID_REGEX.test(recinto_id)) {
    return NextResponse.json(
      { error: 'recinto_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  // Get members assigned to this recinto
  const { data, error } = await supabase
    .from('miembros')
    .select('id, cedula, nombre, apellido, votacion, celular, telefono')
    .eq('recinto_id', recinto_id)
    .eq('estado', true)
    .order('apellido', { ascending: true });

  if (error) {
    console.error('Error fetching turnout members:', error);
    return NextResponse.json(
      { error: 'Error al obtener miembros' },
      { status: 500 }
    );
  }

  const members = data ?? [];

  // Calculate stats
  const total = members.length;
  const votaron = members.filter(
    (m) => (m as Record<string, unknown>).votacion === true
  ).length;
  const noVotaron = total - votaron;
  const porcentaje = total > 0 ? Math.round((votaron / total) * 100) : 0;

  return NextResponse.json({
    data: members,
    stats: { total, votaron, no_votaron: noVotaron, porcentaje },
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/electoral/turnout
// ---------------------------------------------------------------------------
// Toggle a member's votacion status.
// Body: { member_id: string, votacion: boolean }

export async function PATCH(request: Request) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'observer'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para actualizar el estado de votacion.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const { member_id, votacion } = body as {
    member_id?: string;
    votacion?: boolean;
  };

  if (!member_id || !UUID_REGEX.test(member_id)) {
    return NextResponse.json(
      { error: 'member_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (typeof votacion !== 'boolean') {
    return NextResponse.json(
      { error: 'votacion debe ser un booleano (true/false)' },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('miembros')
    .update({ votacion })
    .eq('id', member_id)
    .select('id, votacion')
    .single();

  if (error) {
    console.error('Error updating votacion:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado de votacion' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
