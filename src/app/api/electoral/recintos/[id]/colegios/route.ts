import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/electoral/recintos/[id]/colegios
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  const { id: recintoId } = params;
  if (!UUID_REGEX.test(recintoId)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('colegios')
    .select('*')
    .eq('recinto_id', recintoId)
    .eq('estado', true)
    .order('cod_colegio', { ascending: true });

  if (error) {
    console.error('Error fetching colegios:', error);
    return NextResponse.json(
      { error: 'Error al obtener colegios' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/electoral/recintos/[id]/colegios
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para crear colegios.' },
      { status: 403 }
    );
  }

  const { id: recintoId } = params;
  if (!UUID_REGEX.test(recintoId)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const { cod_colegio, nombre } = body as {
    cod_colegio?: string;
    nombre?: string;
  };

  if (!cod_colegio || !cod_colegio.trim()) {
    return NextResponse.json(
      { error: 'El codigo del colegio es requerido' },
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

  const insertData: Database['public']['Tables']['colegios']['Insert'] = {
    cod_colegio: cod_colegio.trim(),
    recinto_id: recintoId,
    partido_id: authResult.partidoId,
    tenant_id: authResult.tenantId,
  };

  if (nombre) insertData.nombre = nombre.trim();

  const { data, error } = await supabase
    .from('colegios')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating colegio:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya existe un colegio con ese codigo en este recinto' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear colegio' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
