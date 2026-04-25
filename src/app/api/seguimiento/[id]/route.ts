import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

type SeguimientoUpdate = Database['public']['Tables']['seguimiento_no_inscritos']['Update'];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_ESTADOS = [
  'no_contactado',
  'contactado',
  'seguimiento_programado',
  'registrado',
  'rechazado',
];

const VALID_CONTACTO = ['SI', 'NO'];

// ---------------------------------------------------------------------------
// GET /api/seguimiento/[id]
// ---------------------------------------------------------------------------
// Get a single follow-up record with its padron data.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'field_worker'].includes(authResult.role)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'ID debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('seguimiento_no_inscritos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching seguimiento:', error);
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Registro de seguimiento no encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Error al obtener registro de seguimiento' },
      { status: 500 }
    );
  }

  // Fetch padron data for this cedula
  const record = data as Record<string, unknown>;
  let padron = null;
  if (record.cedula) {
    const { data: padronData } = await supabase
      .from('padron_externo')
      .select('*')
      .eq('cedula', record.cedula as string)
      .limit(1)
      .maybeSingle();
    padron = padronData;
  }

  return NextResponse.json({ data, padron });
}

// ---------------------------------------------------------------------------
// PATCH /api/seguimiento/[id]
// ---------------------------------------------------------------------------
// Update a follow-up record (status, outcome, scheduling).

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'field_worker'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para actualizar registros de seguimiento.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'ID debe ser un UUID valido' },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const {
    contacto,
    decision_voto,
    decision_presidente,
    comentario,
    estado,
    fecha_proximo_seguimiento,
    fecha_conversion,
    miembro_id,
  } = body as {
    contacto?: string;
    decision_voto?: string;
    decision_presidente?: string;
    comentario?: string;
    estado?: string;
    fecha_proximo_seguimiento?: string | null;
    fecha_conversion?: string | null;
    miembro_id?: string | null;
  };

  // Validate optional fields
  if (contacto && !VALID_CONTACTO.includes(contacto)) {
    return NextResponse.json(
      { error: 'contacto debe ser SI o NO' },
      { status: 400 }
    );
  }

  if (estado && !VALID_ESTADOS.includes(estado)) {
    return NextResponse.json(
      { error: `Estado invalido. Debe ser uno de: ${VALID_ESTADOS.join(', ')}` },
      { status: 400 }
    );
  }

  if (miembro_id && !UUID_REGEX.test(miembro_id)) {
    return NextResponse.json(
      { error: 'miembro_id debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Build update object with only provided fields
  const updateData: SeguimientoUpdate = {};
  if (contacto !== undefined) updateData.contacto = contacto;
  if (decision_voto !== undefined) updateData.decision_voto = decision_voto;
  if (decision_presidente !== undefined) updateData.decision_presidente = decision_presidente;
  if (comentario !== undefined) updateData.comentario = comentario;
  if (estado !== undefined) updateData.estado = estado;
  if (fecha_proximo_seguimiento !== undefined) updateData.fecha_proximo_seguimiento = fecha_proximo_seguimiento;
  if (fecha_conversion !== undefined) updateData.fecha_conversion = fecha_conversion;
  if (miembro_id !== undefined) updateData.miembro_id = miembro_id;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No se proporcionaron campos para actualizar' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('seguimiento_no_inscritos')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating seguimiento:', error);
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Registro de seguimiento no encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar registro de seguimiento' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
