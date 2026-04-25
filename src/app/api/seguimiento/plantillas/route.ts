import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import type { Database } from '@/types/supabase';

type PlantillaInsert = Database['public']['Tables']['plantillas_llamada']['Insert'];
type PlantillaUpdate = Database['public']['Tables']['plantillas_llamada']['Update'];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/seguimiento/plantillas
// ---------------------------------------------------------------------------
// List call script templates. All seguimiento-authorized roles can read.
// Query params: activa (optional, 'true' or 'false')

export async function GET(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'field_worker'].includes(authResult.role)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const activaParam = searchParams.get('activa');

  let query = supabase
    .from('plantillas_llamada')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by partido_id from active period
  if (authResult.partidoId) {
    query = query.eq('partido_id', authResult.partidoId);
  }

  // Filter by active status
  if (activaParam === 'true') {
    query = query.eq('activa', true);
  } else if (activaParam === 'false') {
    query = query.eq('activa', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching plantillas:', error);
    return NextResponse.json(
      { error: 'Error al obtener plantillas de llamada' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/seguimiento/plantillas
// ---------------------------------------------------------------------------
// Create a new call script template. Admin only.

export async function POST(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden crear plantillas.' },
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

  const nombre = body.nombre as string | undefined;
  const contenido = body.contenido as string | undefined;
  const activa = body.activa as boolean | undefined;

  if (!nombre || nombre.trim() === '') {
    return NextResponse.json(
      { error: 'nombre es requerido' },
      { status: 400 }
    );
  }

  if (!contenido || contenido.trim() === '') {
    return NextResponse.json(
      { error: 'contenido es requerido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const insertData: PlantillaInsert = {
    nombre: nombre.trim(),
    contenido: contenido.trim(),
    activa: activa !== undefined ? activa : true,
    partido_id: authResult.partidoId!,
  };

  const { data, error } = await supabase
    .from('plantillas_llamada')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating plantilla:', error);
    return NextResponse.json(
      { error: 'Error al crear plantilla de llamada' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH /api/seguimiento/plantillas
// ---------------------------------------------------------------------------
// Update an existing call script template. Admin only.
// Body must include "id" field.

export async function PATCH(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden actualizar plantillas.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const id = body.id as string | undefined;
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const updateData: PlantillaUpdate = {};
  if (body.nombre !== undefined) updateData.nombre = (body.nombre as string).trim();
  if (body.contenido !== undefined) updateData.contenido = (body.contenido as string).trim();
  if (body.activa !== undefined) updateData.activa = body.activa as boolean;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No se proporcionaron campos para actualizar' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('plantillas_llamada')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating plantilla:', error);
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar plantilla' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
