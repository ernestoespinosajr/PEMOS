import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/electoral/dashboard/turnout
 *
 * Returns turnout statistics by recinto for the dashboard, scoped by
 * electoral period.
 *
 * Uses the rpc_dashboard_turnout RPC function for period-scoped data.
 * Falls back to the mv_turnout_por_recinto materialized view if the
 * RPC is unavailable (materialized view is not period-scoped).
 *
 * Query params:
 *   - periodo_id (required): UUID of the electoral period
 *   - recinto_id (optional): filter to a specific recinto
 *
 * Response:
 *   { data: Array<RecintoTurnout> }
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
  const recinto_id = searchParams.get('recinto_id');

  if (!periodo_id || !UUID_REGEX.test(periodo_id)) {
    return NextResponse.json(
      { error: 'periodo_id es requerido y debe ser un UUID valido' },
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
    // Use database-level aggregation via RPC (period-scoped turnout)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not yet in generated types
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      'rpc_dashboard_turnout',
      {
        p_periodo_id: periodo_id,
        p_recinto_id: recinto_id || null,
      }
    );

    if (rpcError) {
      // If RPC is unavailable, fall back to materialized view (not period-scoped)
      console.error('Error calling rpc_dashboard_turnout, falling back to MV:', rpcError);

      let fallbackQuery = supabase
        .from('mv_turnout_por_recinto')
        .select('recinto_id, recinto_nombre, total_miembros, votaron, no_votaron')
        .gt('total_miembros', 0)
        .order('recinto_nombre', { ascending: true });

      if (recinto_id) {
        fallbackQuery = fallbackQuery.eq('recinto_id', recinto_id);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        console.error('Error in turnout fallback query:', fallbackError);
        return NextResponse.json(
          { error: 'Error al obtener datos de participacion' },
          { status: 500 }
        );
      }

      const result = (fallbackData ?? []).map((row: Record<string, unknown>) => {
        const r = row;
        const total = (r.total_miembros as number) ?? 0;
        const voted = (r.votaron as number) ?? 0;

        return {
          recinto_id: r.recinto_id as string,
          recinto_nombre: r.recinto_nombre as string,
          total_miembros: total,
          votaron: voted,
          no_votaron: (r.no_votaron as number) ?? 0,
          porcentaje: total > 0 ? Math.round((voted / total) * 100) : 0,
        };
      });

      return NextResponse.json({ data: result });
    }

    // Transform RPC results
    const rows = (rpcData ?? []) as Array<{
      recinto_id: string;
      recinto_nombre: string;
      total_miembros: number;
      votaron: number;
      no_votaron: number;
      porcentaje: number;
    }>;

    const result = rows.map((row) => ({
      recinto_id: row.recinto_id,
      recinto_nombre: row.recinto_nombre,
      total_miembros: Number(row.total_miembros),
      votaron: Number(row.votaron),
      no_votaron: Number(row.no_votaron),
      porcentaje: Number(row.porcentaje),
    }));

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Error in dashboard turnout:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
