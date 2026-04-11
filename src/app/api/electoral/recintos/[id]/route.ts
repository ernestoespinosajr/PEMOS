import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/electoral/recintos/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  const { id } = params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('recintos')
    .select(`
      *,
      municipios(nombre),
      circunscripciones(nombre)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching recinto:', error);
    return NextResponse.json(
      { error: 'Recinto no encontrado' },
      { status: 404 }
    );
  }

  const r = data as Record<string, unknown>;
  const municipio = r.municipios as { nombre: string } | null;
  const circunscripcion = r.circunscripciones as { nombre: string } | null;

  return NextResponse.json({
    data: {
      ...r,
      municipios: undefined,
      circunscripciones: undefined,
      municipio_nombre: municipio?.nombre ?? null,
      circunscripcion_nombre: circunscripcion?.nombre ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/electoral/recintos/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para editar recintos.' },
      { status: 403 }
    );
  }

  const { id } = params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.cod_recinto !== undefined) {
    if (typeof body.cod_recinto !== 'string' || !body.cod_recinto.trim()) {
      return NextResponse.json(
        { error: 'El codigo del recinto no puede estar vacio' },
        { status: 400 }
      );
    }
    updates.cod_recinto = (body.cod_recinto as string).trim();
  }

  if (body.nombre !== undefined) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
      return NextResponse.json(
        { error: 'El nombre no puede estar vacio' },
        { status: 400 }
      );
    }
    updates.nombre = (body.nombre as string).trim();
  }

  if (body.direccion !== undefined) {
    updates.direccion = body.direccion ? (body.direccion as string).trim() : null;
  }

  if (body.municipio_id !== undefined) {
    if (
      typeof body.municipio_id !== 'string' ||
      !UUID_REGEX.test(body.municipio_id)
    ) {
      return NextResponse.json(
        { error: 'municipio_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    updates.municipio_id = body.municipio_id;
  }

  if (body.circunscripcion_id !== undefined) {
    if (
      body.circunscripcion_id &&
      !UUID_REGEX.test(body.circunscripcion_id as string)
    ) {
      return NextResponse.json(
        { error: 'circunscripcion_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    updates.circunscripcion_id = body.circunscripcion_id || null;
  }

  if (body.estado !== undefined) {
    updates.estado = Boolean(body.estado);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No se proporcionaron campos para actualizar' },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('recintos')
    .update(updates as Database['public']['Tables']['recintos']['Update'])
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating recinto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar recinto' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// ---------------------------------------------------------------------------
// DELETE /api/electoral/recintos/[id] (soft delete)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden eliminar recintos.' },
      { status: 403 }
    );
  }

  const { id } = params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('recintos')
    .update({ estado: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting recinto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar recinto' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
