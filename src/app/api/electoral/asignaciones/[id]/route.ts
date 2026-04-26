import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// DELETE /api/electoral/asignaciones/[id] (soft delete)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) return authResult.response;

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden eliminar asignaciones.' },
      { status: 403 }
    );
  }

  const { id } = params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('asignacion_recintos')
    .update({ estado: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting asignacion:', error);
    return NextResponse.json(
      { error: 'Error al eliminar asignacion' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
