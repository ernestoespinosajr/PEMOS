import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/electoral/votos/init
 *
 * Calls the init_vote_records() RPC to auto-create candidato_votos rows
 * for all active candidates when a colegio is first accessed.
 * Idempotent: uses ON CONFLICT DO NOTHING.
 */
export async function POST(request: Request) {
  const supabase = createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const { colegio_id, recinto_id, periodo_id, partido_id } = body as {
    colegio_id?: string;
    recinto_id?: string;
    periodo_id?: string;
    partido_id?: string;
  };

  if (!colegio_id || !UUID_REGEX.test(colegio_id)) {
    return NextResponse.json(
      { error: 'colegio_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!recinto_id || !UUID_REGEX.test(recinto_id)) {
    return NextResponse.json(
      { error: 'recinto_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!periodo_id || !UUID_REGEX.test(periodo_id)) {
    return NextResponse.json(
      { error: 'periodo_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!partido_id || !UUID_REGEX.test(partido_id)) {
    return NextResponse.json(
      { error: 'partido_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('init_vote_records', {
    p_colegio_id: colegio_id,
    p_recinto_id: recinto_id,
    p_periodo_id: periodo_id,
    p_partido_id: partido_id,
  });

  if (error) {
    console.error('Error initializing vote records:', error);
    return NextResponse.json(
      { error: 'Error al inicializar registros de votos' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { records_created: data ?? 0 },
  });
}
