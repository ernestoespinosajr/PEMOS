import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/electoral/dashboard/timeline
 *
 * Returns vote totals and acta counts bucketed over time for the line chart.
 * Groups candidato_votos.updated_at and actas.created_at into time buckets.
 *
 * Query params:
 *   - periodo_id (required): UUID of the electoral period
 *   - interval_minutes (optional, default 30): bucket size in minutes
 *
 * Response:
 *   { data: Array<{ timestamp, total_votos, actas_count }> }
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
  const intervalParam = searchParams.get('interval_minutes');
  const intervalMinutes = intervalParam ? parseInt(intervalParam, 10) : 30;

  if (!periodo_id || !UUID_REGEX.test(periodo_id)) {
    return NextResponse.json(
      { error: 'periodo_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (isNaN(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 1440) {
    return NextResponse.json(
      { error: 'interval_minutes debe ser un numero entre 1 y 1440' },
      { status: 400 }
    );
  }

  try {
    // Use database-level bucketing via RPC (date_trunc GROUP BY)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not yet in generated types
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      'rpc_dashboard_timeline',
      {
        p_periodo_id: periodo_id,
        p_interval_minutes: intervalMinutes,
      }
    );

    if (rpcError) {
      console.error('Error fetching timeline via RPC:', rpcError);
      return NextResponse.json(
        { error: 'Error al obtener linea de tiempo de votos' },
        { status: 500 }
      );
    }

    // RPC returns sorted buckets; compute cumulative totals
    let cumulativeVotos = 0;
    let cumulativeActas = 0;

    const rows = (rpcData ?? []) as Array<{
      bucket: string;
      bucket_votos: number;
      bucket_actas: number;
    }>;

    const result = rows.map((row) => {
      cumulativeVotos += Number(row.bucket_votos);
      cumulativeActas += Number(row.bucket_actas);
      return {
        timestamp: row.bucket,
        total_votos: cumulativeVotos,
        actas_count: cumulativeActas,
      };
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Error in dashboard timeline:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
