import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

type SeguimientoInsert = Database['public']['Tables']['seguimiento_no_inscritos']['Insert'];

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
// GET /api/seguimiento
// ---------------------------------------------------------------------------
// List follow-up records with optional filters.
// Query params: cedula, estado, recinto_id, page (default 1), page_size (25)

export async function GET(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'field_worker'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado.' },
      { status: 403 }
    );
  }

  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const cedula = searchParams.get('cedula')?.trim() || null;
  const estado = searchParams.get('estado') || null;
  const recinto_id = searchParams.get('recinto_id') || null;
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const page_size = Math.min(
    Math.max(parseInt(searchParams.get('page_size') || '25', 10), 1),
    100
  );

  // Validate estado
  if (estado && !VALID_ESTADOS.includes(estado)) {
    return NextResponse.json(
      { error: `Estado invalido. Debe ser uno de: ${VALID_ESTADOS.join(', ')}` },
      { status: 400 }
    );
  }

  // Validate recinto_id
  if (recinto_id && !UUID_REGEX.test(recinto_id)) {
    return NextResponse.json(
      { error: 'recinto_id debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const offset = (page - 1) * page_size;

  let query = supabase
    .from('seguimiento_no_inscritos')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + page_size - 1);

  // Filter by partido_id from active period
  if (authResult.partidoId) {
    query = query.eq('partido_id', authResult.partidoId);
  }

  // Field workers only see their own records
  if (authResult.role === 'field_worker') {
    query = query.eq('usuario_id', authResult.authUserId);
  }

  if (cedula) {
    query = query.eq('cedula', cedula.replace(/\D/g, ''));
  }

  if (estado) {
    query = query.eq('estado', estado);
  }

  if (recinto_id) {
    query = query.eq('recinto_id', recinto_id);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching seguimientos:', error);
    return NextResponse.json(
      { error: 'Error al obtener registros de seguimiento' },
      { status: 500 }
    );
  }

  const total = count ?? 0;
  const total_pages = Math.ceil(total / page_size);

  return NextResponse.json({
    data: data ?? [],
    meta: {
      total,
      page,
      page_size,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/seguimiento
// ---------------------------------------------------------------------------
// Create a new follow-up record.

export async function POST(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'field_worker'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para crear registros de seguimiento.' },
      { status: 403 }
    );
  }

  if (!authResult.partidoId) {
    return NextResponse.json(
      { error: 'No hay un periodo electoral activo configurado' },
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
    cedula,
    colegio,
    recinto_id,
    cod_recinto,
    contacto,
    decision_voto,
    decision_presidente,
    comentario,
    estado,
    fecha_proximo_seguimiento,
  } = body as {
    cedula?: string;
    colegio?: string;
    recinto_id?: string;
    cod_recinto?: string;
    contacto?: string;
    decision_voto?: string;
    decision_presidente?: string;
    comentario?: string;
    estado?: string;
    fecha_proximo_seguimiento?: string;
  };

  // Validate required fields
  if (!cedula || cedula.trim() === '') {
    return NextResponse.json(
      { error: 'cedula es requerida' },
      { status: 400 }
    );
  }

  if (!contacto || !VALID_CONTACTO.includes(contacto)) {
    return NextResponse.json(
      { error: 'contacto es requerido y debe ser SI o NO' },
      { status: 400 }
    );
  }

  const finalEstado = estado || (contacto === 'SI' ? 'contactado' : 'no_contactado');
  if (!VALID_ESTADOS.includes(finalEstado)) {
    return NextResponse.json(
      { error: `Estado invalido. Debe ser uno de: ${VALID_ESTADOS.join(', ')}` },
      { status: 400 }
    );
  }

  if (recinto_id && !UUID_REGEX.test(recinto_id)) {
    return NextResponse.json(
      { error: 'recinto_id debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const insertData: SeguimientoInsert = {
    cedula: cedula.replace(/\D/g, ''),
    contacto,
    estado: finalEstado,
    usuario_id: authResult.authUserId,
    partido_id: authResult.partidoId!,
    colegio: colegio || null,
    recinto_id: recinto_id || null,
    cod_recinto: cod_recinto || null,
    decision_voto: decision_voto || null,
    decision_presidente: decision_presidente || null,
    comentario: comentario ? comentario.trim() : null,
    fecha_proximo_seguimiento: fecha_proximo_seguimiento || null,
  };

  const { data, error } = await supabase
    .from('seguimiento_no_inscritos')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating seguimiento:', error);
    return NextResponse.json(
      { error: 'Error al crear registro de seguimiento' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
