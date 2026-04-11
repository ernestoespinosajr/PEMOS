import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/seguimiento/[id]/historial
// ---------------------------------------------------------------------------
// Returns the follow-up history for a specific seguimiento record.
// Ordered by created_at descending (most recent first).

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'field_worker'].includes(authResult.role)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'ID debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('seguimiento_no_inscritos_historial')
    .select('*')
    .eq('seguimiento_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching historial:', error);
    return NextResponse.json(
      { error: 'Error al obtener historial de seguimiento' },
      { status: 500 }
    );
  }

  // Resolve usuario names
  const usuarioIds = [
    ...new Set((data ?? []).map((h) => (h as Record<string, unknown>).usuario_id as string)),
  ];

  let usuarioMap: Record<string, { nombre: string; apellido: string }> = {};

  if (usuarioIds.length > 0) {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('auth_user_id, nombre, apellido')
      .in('auth_user_id', usuarioIds);

    if (usuarios) {
      for (const u of usuarios) {
        const ur = u as Record<string, unknown>;
        usuarioMap[ur.auth_user_id as string] = {
          nombre: ur.nombre as string,
          apellido: ur.apellido as string,
        };
      }
    }
  }

  const items = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const userId = r.usuario_id as string;
    const usuario = usuarioMap[userId];
    return {
      ...r,
      usuario_nombre: usuario?.nombre ?? null,
      usuario_apellido: usuario?.apellido ?? null,
    };
  });

  return NextResponse.json({ data: items });
}
