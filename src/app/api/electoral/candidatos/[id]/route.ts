import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/electoral/candidatos/[id]
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
    .from('candidatos')
    .select(`
      *,
      partidos(nombre, siglas, color)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching candidato:', error);
    return NextResponse.json(
      { error: 'Candidato no encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// ---------------------------------------------------------------------------
// PATCH /api/electoral/candidatos/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para editar candidatos.' },
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

  if (body.nombre !== undefined) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
      return NextResponse.json(
        { error: 'El nombre no puede estar vacio' },
        { status: 400 }
      );
    }
    updates.nombre = (body.nombre as string).trim();
  }

  if (body.orden !== undefined) {
    if (typeof body.orden !== 'number' || body.orden < 0) {
      return NextResponse.json(
        { error: 'El orden debe ser un numero positivo' },
        { status: 400 }
      );
    }
    updates.orden = body.orden;
  }

  if (body.partido_id !== undefined) {
    if (typeof body.partido_id !== 'string' || !UUID_REGEX.test(body.partido_id)) {
      return NextResponse.json(
        { error: 'partido_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    updates.partido_id = body.partido_id;
  }

  if (body.periodo_id !== undefined) {
    if (typeof body.periodo_id !== 'string' || !UUID_REGEX.test(body.periodo_id)) {
      return NextResponse.json(
        { error: 'periodo_id debe ser un UUID valido' },
        { status: 400 }
      );
    }
    updates.periodo_id = body.periodo_id;
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
    .from('candidatos')
    .update(updates as Database['public']['Tables']['candidatos']['Update'])
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating candidato:', error);
    return NextResponse.json(
      { error: 'Error al actualizar candidato' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// ---------------------------------------------------------------------------
// DELETE /api/electoral/candidatos/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden eliminar candidatos.' },
      { status: 403 }
    );
  }

  const { id } = params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  const supabase = createClient();

  // Soft delete: set estado = false
  const { error } = await supabase
    .from('candidatos')
    .update({ estado: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting candidato:', error);
    return NextResponse.json(
      { error: 'Error al eliminar candidato' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
