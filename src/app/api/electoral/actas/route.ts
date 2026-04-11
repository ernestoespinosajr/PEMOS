import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/electoral/actas
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const periodo_id = searchParams.get('periodo_id') || null;
  const recinto_id = searchParams.get('recinto_id') || null;
  const colegio_id = searchParams.get('colegio_id') || null;

  let query = supabase
    .from('actas')
    .select(`
      *,
      recintos(nombre, cod_recinto),
      colegios(nombre, cod_colegio)
    `)
    .eq('estado', true)
    .order('created_at', { ascending: false });

  if (periodo_id) {
    if (!UUID_REGEX.test(periodo_id)) {
      return NextResponse.json(
        { error: 'periodo_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    query = query.eq('periodo_id', periodo_id);
  }

  if (recinto_id) {
    if (!UUID_REGEX.test(recinto_id)) {
      return NextResponse.json(
        { error: 'recinto_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    query = query.eq('recinto_id', recinto_id);
  }

  if (colegio_id) {
    if (!UUID_REGEX.test(colegio_id)) {
      return NextResponse.json(
        { error: 'colegio_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    query = query.eq('colegio_id', colegio_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching actas:', error);
    return NextResponse.json(
      { error: 'Error al obtener actas' },
      { status: 500 }
    );
  }

  // Resolve registrado_por names
  const userIds = [
    ...new Set(
      (data ?? []).map((a) => (a as Record<string, unknown>).registrado_por as string)
    ),
  ];

  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('auth_user_id, nombre, apellido')
      .in('auth_user_id', userIds);

    if (usuarios) {
      for (const u of usuarios) {
        const ur = u as Record<string, unknown>;
        userMap[ur.auth_user_id as string] =
          `${ur.nombre as string} ${ur.apellido as string}`;
      }
    }
  }

  const items = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const recinto = r.recintos as { nombre: string; cod_recinto: string } | null;
    const colegio = r.colegios as { nombre: string; cod_colegio: string } | null;
    const registradoPor = r.registrado_por as string;

    return {
      ...r,
      recintos: undefined,
      colegios: undefined,
      recinto_nombre: recinto?.nombre ?? null,
      recinto_cod: recinto?.cod_recinto ?? null,
      colegio_nombre: colegio?.nombre ?? null,
      colegio_cod: colegio?.cod_colegio ?? null,
      registrado_por_nombre: userMap[registradoPor] ?? null,
    };
  });

  return NextResponse.json({ data: items });
}

// ---------------------------------------------------------------------------
// POST /api/electoral/actas
// ---------------------------------------------------------------------------
// Creates an acta (append-only). Snapshots current candidato_votos into
// votos_data JSONB field.

export async function POST(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'observer'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para crear actas.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const { numero_acta, recinto_id, colegio_id, observaciones, periodo_id } =
    body as {
      numero_acta?: string;
      recinto_id?: string;
      colegio_id?: string;
      observaciones?: string;
      periodo_id?: string;
    };

  if (!recinto_id || !UUID_REGEX.test(recinto_id)) {
    return NextResponse.json(
      { error: 'recinto_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!colegio_id || !UUID_REGEX.test(colegio_id)) {
    return NextResponse.json(
      { error: 'colegio_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!periodo_id || !UUID_REGEX.test(periodo_id)) {
    return NextResponse.json(
      { error: 'periodo_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!authResult.partidoId) {
    return NextResponse.json(
      { error: 'No hay un periodo electoral activo configurado' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Snapshot current candidato_votos for this colegio
  const { data: votosData } = await supabase
    .from('candidato_votos')
    .select('candidato_id, votos')
    .eq('colegio_id', colegio_id)
    .eq('periodo_id', periodo_id)
    .eq('estado', true);

  const votosSnapshot: Record<string, number> = {};
  if (votosData) {
    for (const v of votosData) {
      const vr = v as Record<string, unknown>;
      votosSnapshot[vr.candidato_id as string] = vr.votos as number;
    }
  }

  const insertData: Database['public']['Tables']['actas']['Insert'] = {
    recinto_id,
    colegio_id,
    votos_data: votosSnapshot,
    registrado_por: authResult.authUserId,
    periodo_id,
    partido_id: authResult.partidoId,
    tenant_id: authResult.tenantId,
  };

  if (numero_acta) insertData.numero_acta = numero_acta.trim();
  if (observaciones) insertData.observaciones = observaciones.trim();

  const { data, error } = await supabase
    .from('actas')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating acta:', error);
    return NextResponse.json(
      { error: 'Error al crear acta' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
