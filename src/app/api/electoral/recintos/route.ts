import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/electoral/recintos
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const municipio_id = searchParams.get('municipio_id') || null;
  const circunscripcion_id = searchParams.get('circunscripcion_id') || null;
  const search = searchParams.get('search')?.trim() || null;
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const page_size = 25;

  let query = supabase
    .from('recintos')
    .select(
      `
      *,
      municipios(nombre),
      circunscripciones(nombre)
    `,
      { count: 'exact' }
    )
    .eq('estado', true)
    .order('nombre', { ascending: true });

  if (municipio_id) {
    if (!UUID_REGEX.test(municipio_id)) {
      return NextResponse.json(
        { error: 'municipio_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    query = query.eq('municipio_id', municipio_id);
  }

  if (circunscripcion_id) {
    if (!UUID_REGEX.test(circunscripcion_id)) {
      return NextResponse.json(
        { error: 'circunscripcion_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    query = query.eq('circunscripcion_id', circunscripcion_id);
  }

  if (search) {
    query = query.or(
      `nombre.ilike.%${search}%,cod_recinto.ilike.%${search}%`
    );
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching recintos:', error);
    return NextResponse.json(
      { error: 'Error al obtener recintos' },
      { status: 500 }
    );
  }

  // For each recinto, fetch colegio count and observador count
  const recintoIds = (data ?? []).map((r) => (r as Record<string, unknown>).id as string);

  let colegioCountMap: Record<string, number> = {};
  let observadorCountMap: Record<string, number> = {};

  if (recintoIds.length > 0) {
    // Colegio counts
    const { data: colegios } = await supabase
      .from('colegios')
      .select('recinto_id')
      .in('recinto_id', recintoIds)
      .eq('estado', true);

    if (colegios) {
      colegioCountMap = colegios.reduce(
        (acc, c) => {
          const rid = (c as Record<string, unknown>).recinto_id as string;
          acc[rid] = (acc[rid] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }

    // Observer assignment counts
    const { data: asignaciones } = await supabase
      .from('asignacion_recintos')
      .select('recinto_id')
      .in('recinto_id', recintoIds)
      .eq('estado', true);

    if (asignaciones) {
      observadorCountMap = asignaciones.reduce(
        (acc, a) => {
          const rid = (a as Record<string, unknown>).recinto_id as string;
          acc[rid] = (acc[rid] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  const items = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const municipio = r.municipios as { nombre: string } | null;
    const circunscripcion = r.circunscripciones as { nombre: string } | null;
    const id = r.id as string;

    return {
      ...r,
      municipios: undefined,
      circunscripciones: undefined,
      municipio_nombre: municipio?.nombre ?? null,
      circunscripcion_nombre: circunscripcion?.nombre ?? null,
      colegios_count: colegioCountMap[id] ?? 0,
      observadores_count: observadorCountMap[id] ?? 0,
    };
  });

  return NextResponse.json({
    data: items,
    meta: {
      total: count ?? 0,
      page,
      page_size,
      total_pages: Math.ceil((count ?? 0) / page_size),
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/electoral/recintos
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para crear recintos.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const { cod_recinto, nombre, direccion, municipio_id, circunscripcion_id } =
    body as {
      cod_recinto?: string;
      nombre?: string;
      direccion?: string;
      municipio_id?: string;
      circunscripcion_id?: string;
    };

  if (!cod_recinto || !cod_recinto.trim()) {
    return NextResponse.json(
      { error: 'El codigo del recinto es requerido' },
      { status: 400 }
    );
  }

  if (!nombre || !nombre.trim()) {
    return NextResponse.json(
      { error: 'El nombre del recinto es requerido' },
      { status: 400 }
    );
  }

  if (!municipio_id || !UUID_REGEX.test(municipio_id)) {
    return NextResponse.json(
      { error: 'municipio_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const insertData: Database['public']['Tables']['recintos']['Insert'] = {
    cod_recinto: cod_recinto.trim(),
    nombre: nombre.trim(),
    municipio_id,
    tenant_id: authResult.tenantId,
    partido_id: authResult.partidoId,
  };

  if (direccion) insertData.direccion = direccion.trim();
  if (circunscripcion_id && UUID_REGEX.test(circunscripcion_id)) {
    insertData.circunscripcion_id = circunscripcion_id;
  }

  const { data, error } = await supabase
    .from('recintos')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating recinto:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un recinto con ese codigo para este partido' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear recinto' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
