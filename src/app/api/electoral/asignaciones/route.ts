import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/electoral/asignaciones
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const periodo_id = searchParams.get('periodo_id') || null;
  const recinto_id = searchParams.get('recinto_id') || null;
  const usuario_id = searchParams.get('usuario_id') || null;

  let query = supabase
    .from('asignacion_recintos')
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

  if (usuario_id) {
    if (!UUID_REGEX.test(usuario_id)) {
      return NextResponse.json(
        { error: 'usuario_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    query = query.eq('usuario_id', usuario_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching asignaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener asignaciones' },
      { status: 500 }
    );
  }

  // Resolve usuario names: asignacion_recintos.usuario_id references auth.users
  // We need to look up the usuarios table by auth_user_id
  const usuarioIds = [
    ...new Set((data ?? []).map((a) => (a as Record<string, unknown>).usuario_id as string)),
  ];

  let usuarioMap: Record<string, { nombre: string; apellido: string; email: string }> = {};

  if (usuarioIds.length > 0) {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('auth_user_id, nombre, apellido, email')
      .in('auth_user_id', usuarioIds);

    if (usuarios) {
      for (const u of usuarios) {
        const ur = u as Record<string, unknown>;
        const authId = ur.auth_user_id as string;
        usuarioMap[authId] = {
          nombre: ur.nombre as string,
          apellido: ur.apellido as string,
          email: ur.email as string,
        };
      }
    }
  }

  const items = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const recinto = r.recintos as { nombre: string; cod_recinto: string } | null;
    const colegio = r.colegios as { nombre: string; cod_colegio: string } | null;
    const userId = r.usuario_id as string;
    const usuario = usuarioMap[userId];

    return {
      ...r,
      recintos: undefined,
      colegios: undefined,
      recinto_nombre: recinto?.nombre ?? null,
      recinto_cod: recinto?.cod_recinto ?? null,
      colegio_nombre: colegio?.nombre ?? null,
      colegio_cod: colegio?.cod_colegio ?? null,
      usuario_nombre: usuario?.nombre ?? null,
      usuario_apellido: usuario?.apellido ?? null,
      usuario_email: usuario?.email ?? null,
    };
  });

  return NextResponse.json({ data: items });
}

// ---------------------------------------------------------------------------
// POST /api/electoral/asignaciones
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden asignar observadores.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const { recinto_id, colegio_id, usuario_id, periodo_id } = body as {
    recinto_id?: string;
    colegio_id?: string;
    usuario_id?: string;
    periodo_id?: string;
  };

  if (!recinto_id || !UUID_REGEX.test(recinto_id)) {
    return NextResponse.json(
      { error: 'recinto_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!usuario_id || !UUID_REGEX.test(usuario_id)) {
    return NextResponse.json(
      { error: 'usuario_id es requerido y debe ser un UUID valido' },
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

  const insertData: Database['public']['Tables']['asignacion_recintos']['Insert'] = {
    recinto_id,
    usuario_id,
    periodo_id,
    partido_id: authResult.partidoId,
    tenant_id: authResult.tenantId,
  };

  if (colegio_id && UUID_REGEX.test(colegio_id)) {
    insertData.colegio_id = colegio_id;
  }

  const { data, error } = await supabase
    .from('asignacion_recintos')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating asignacion:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Esta asignacion ya existe' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear asignacion' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
