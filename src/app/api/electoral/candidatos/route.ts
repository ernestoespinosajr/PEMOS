import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/electoral/candidatos
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const periodo_id = searchParams.get('periodo_id') || null;
  const partido_id = searchParams.get('partido_id') || null;
  const search = searchParams.get('search')?.trim() || null;
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const page_size = 25;

  let query = supabase
    .from('candidatos')
    .select(
      `
      *,
      partidos(nombre, siglas, color)
    `,
      { count: 'exact' }
    )
    .eq('estado', true)
    .order('orden', { ascending: true });

  if (periodo_id) {
    if (!UUID_REGEX.test(periodo_id)) {
      return NextResponse.json(
        { error: 'periodo_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    query = query.eq('periodo_id', periodo_id);
  }

  if (partido_id) {
    if (!UUID_REGEX.test(partido_id)) {
      return NextResponse.json(
        { error: 'partido_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    query = query.eq('partido_id', partido_id);
  }

  if (search) {
    query = query.ilike('nombre', `%${search}%`);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching candidatos:', error);
    return NextResponse.json(
      { error: 'Error al obtener candidatos' },
      { status: 500 }
    );
  }

  const items = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const partido = r.partidos as {
      nombre: string;
      siglas: string;
      color: string;
    } | null;
    return {
      ...r,
      partidos: undefined,
      partido_nombre: partido?.nombre ?? null,
      partido_siglas: partido?.siglas ?? null,
      partido_color: partido?.color ?? null,
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
// POST /api/electoral/candidatos
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado. Solo administradores y coordinadores pueden crear candidatos.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const { nombre, partido_id, cargo_id, orden, periodo_id } = body as {
    nombre?: string;
    partido_id?: string;
    cargo_id?: string;
    orden?: number;
    periodo_id?: string;
  };

  if (!nombre || !nombre.trim()) {
    return NextResponse.json(
      { error: 'El nombre del candidato es requerido' },
      { status: 400 }
    );
  }

  if (!partido_id || !UUID_REGEX.test(partido_id)) {
    return NextResponse.json(
      { error: 'partido_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (orden == null || typeof orden !== 'number' || orden < 0) {
    return NextResponse.json(
      { error: 'El orden es requerido y debe ser un numero positivo' },
      { status: 400 }
    );
  }

  if (!periodo_id || !UUID_REGEX.test(periodo_id)) {
    return NextResponse.json(
      { error: 'periodo_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const insertData: Database['public']['Tables']['candidatos']['Insert'] = {
    nombre: nombre.trim(),
    partido_id,
    orden,
    periodo_id,
    tenant_id: authResult.tenantId,
  };

  if (cargo_id && UUID_REGEX.test(cargo_id)) {
    insertData.cargo_id = cargo_id;
  }

  const { data, error } = await supabase
    .from('candidatos')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating candidato:', error);
    return NextResponse.json(
      { error: 'Error al crear candidato' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
