import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';

// ---------------------------------------------------------------------------
// GET /api/seguimiento/queue
// ---------------------------------------------------------------------------
// Returns the follow-up queue for the authenticated user.
// Query params: limit (default 25), offset (default 0)

export async function GET(request: Request) {
  const authResult = await verifyApiAuth();
  if (!authResult.authorized) return authResult.response;

  if (!['admin', 'coordinator', 'field_worker'].includes(authResult.role)) {
    return NextResponse.json(
      { error: 'No autorizado para acceder a la cola de seguimiento.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '25', 10), 1),
    100
  );
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_followup_queue', {
    p_usuario_id: authResult.authUserId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Error fetching followup queue:', error);
    return NextResponse.json(
      { error: 'Error al obtener cola de seguimiento' },
      { status: 500 }
    );
  }

  const items = (data ?? []) as Array<Record<string, unknown>>;
  const total = items.length > 0 ? Number(items[0]?.total_count ?? 0) : 0;

  return NextResponse.json({
    data: items,
    meta: {
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    },
  });
}
