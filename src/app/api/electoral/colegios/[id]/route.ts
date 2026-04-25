import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// PATCH /api/electoral/colegios/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para editar colegios.' },
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

  if (body.cod_colegio !== undefined) {
    if (typeof body.cod_colegio !== 'string' || !body.cod_colegio.trim()) {
      return NextResponse.json(
        { error: 'El codigo del colegio no puede estar vacio' },
        { status: 400 }
      );
    }
    updates.cod_colegio = (body.cod_colegio as string).trim();
  }

  if (body.nombre !== undefined) {
    updates.nombre = body.nombre ? (body.nombre as string).trim() : null;
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
    .from('colegios')
    .update(updates as Database['public']['Tables']['colegios']['Update'])
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating colegio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar colegio' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// ---------------------------------------------------------------------------
// DELETE /api/electoral/colegios/[id] (soft delete)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden eliminar colegios.' },
      { status: 403 }
    );
  }

  const { id } = params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('colegios')
    .update({ estado: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting colegio:', error);
    return NextResponse.json(
      { error: 'Error al eliminar colegio' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
