import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/electoral/dashboard/by-party
 *
 * Returns vote totals grouped by party for the dashboard bar chart.
 *
 * Query params:
 *   - periodo_id (required): UUID of the electoral period
 *   - circunscripcion_id (optional): filter by circunscripcion
 *   - municipio_id (optional): filter by municipio
 *   - recinto_id (optional): filter by specific recinto
 *
 * Response:
 *   { data: Array<PartyVoteData> }
 */
export async function GET(request: Request) {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periodo_id = searchParams.get('periodo_id');
  const circunscripcion_id = searchParams.get('circunscripcion_id');
  const municipio_id = searchParams.get('municipio_id');
  const recinto_id = searchParams.get('recinto_id');

  if (!periodo_id || !UUID_REGEX.test(periodo_id)) {
    return NextResponse.json(
      { error: 'periodo_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  // Validate optional UUIDs
  if (circunscripcion_id && !UUID_REGEX.test(circunscripcion_id)) {
    return NextResponse.json(
      { error: 'circunscripcion_id debe ser un UUID valido' },
      { status: 400 }
    );
  }
  if (municipio_id && !UUID_REGEX.test(municipio_id)) {
    return NextResponse.json(
      { error: 'municipio_id debe ser un UUID valido' },
      { status: 400 }
    );
  }
  if (recinto_id && !UUID_REGEX.test(recinto_id)) {
    return NextResponse.json(
      { error: 'recinto_id debe ser un UUID valido' },
      { status: 400 }
    );
  }

  try {
    // Use database-level aggregation via RPC (GROUP BY partido with geo filters)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not yet in generated types
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      'rpc_dashboard_by_party',
      {
        p_periodo_id: periodo_id,
        p_circunscripcion_id: circunscripcion_id || null,
        p_municipio_id: municipio_id || null,
        p_recinto_id: recinto_id || null,
      }
    );

    if (rpcError) {
      console.error('Error fetching party votes via RPC:', rpcError);
      return NextResponse.json(
        { error: 'Error al obtener votos por partido' },
        { status: 500 }
      );
    }

    const rows = (rpcData ?? []) as Array<{
      partido_id: string;
      partido_nombre: string;
      partido_siglas: string | null;
      partido_color: string | null;
      total_votos: number;
      recintos_reportados: number;
    }>;

    const result = rows.map((row) => ({
      partido_id: row.partido_id,
      partido_nombre: row.partido_nombre,
      partido_siglas: row.partido_siglas,
      partido_color: row.partido_color,
      total_votos: Number(row.total_votos),
      recintos_reportados: Number(row.recintos_reportados),
    }));

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Error in dashboard by-party:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
