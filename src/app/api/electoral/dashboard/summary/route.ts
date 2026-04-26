import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/electoral/dashboard/summary
 *
 * Returns aggregated vote summary for the election-night dashboard.
 * Uses direct queries (not materialized views) for real-time accuracy.
 *
 * Query params:
 *   - periodo_id (required): UUID of the electoral period
 *
 * Response:
 *   { data: { total_votos, total_recintos, recintos_reportados, total_actas } }
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

  if (!periodo_id || !UUID_REGEX.test(periodo_id)) {
    return NextResponse.json(
      { error: 'periodo_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  try {
    // Use database-level aggregation via RPC (SUM + COUNT DISTINCT in one query)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not yet in generated types
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      'rpc_dashboard_vote_summary',
      { p_periodo_id: periodo_id }
    );

    if (rpcError) {
      console.error('Error fetching vote summary via RPC:', rpcError);
      return NextResponse.json(
        { error: 'Error al obtener totales de votos' },
        { status: 500 }
      );
    }

    const summaryRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    const total_votos = Number((summaryRow as Record<string, unknown>)?.total_votos ?? 0);
    const recintos_reportados = Number((summaryRow as Record<string, unknown>)?.recintos_reportados ?? 0);

    // Total recintos (active) -- lightweight HEAD count query
    const { count: total_recintos, error: recintosError } = await supabase
      .from('recintos')
      .select('id', { count: 'exact', head: true })
      .eq('estado', true);

    if (recintosError) {
      console.error('Error counting recintos:', recintosError);
    }

    // Total actas for this period -- lightweight HEAD count query
    const { count: total_actas, error: actasError } = await supabase
      .from('actas')
      .select('id', { count: 'exact', head: true })
      .eq('periodo_id', periodo_id)
      .eq('estado', true);

    if (actasError) {
      console.error('Error counting actas:', actasError);
    }

    return NextResponse.json({
      data: {
        total_votos,
        total_recintos: total_recintos ?? 0,
        recintos_reportados,
        total_actas: total_actas ?? 0,
      },
    });
  } catch (err) {
    console.error('Error in dashboard summary:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
