import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/electoral/dashboard/precinct-progress
 *
 * Returns acta reporting progress by recinto for the precinct progress table.
 * Shows how many colegios per recinto have submitted actas.
 *
 * Query params:
 *   - periodo_id (required): UUID of the electoral period
 *
 * Response:
 *   { data: Array<PrecinctProgress> }
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
    // Get all active recintos with their colegios count
    const { data: recintosData, error: recintosError } = await supabase
      .from('recintos')
      .select(`
        id,
        nombre,
        colegios(id)
      `)
      .eq('estado', true)
      .order('nombre');

    if (recintosError) {
      console.error('Error fetching recintos with colegios:', recintosError);
      return NextResponse.json(
        { error: 'Error al obtener datos de recintos' },
        { status: 500 }
      );
    }

    // Get actas for this period, grouped by recinto
    const { data: actasData, error: actasError } = await supabase
      .from('actas')
      .select('recinto_id, colegio_id, created_at')
      .eq('periodo_id', periodo_id)
      .eq('estado', true);

    if (actasError) {
      console.error('Error fetching actas:', actasError);
      return NextResponse.json(
        { error: 'Error al obtener datos de actas' },
        { status: 500 }
      );
    }

    // Build a map of recinto_id -> { colegios reported (unique), last_update }
    const actasByRecinto = new Map<
      string,
      { colegioIds: Set<string>; lastUpdate: string }
    >();

    for (const acta of actasData ?? []) {
      const a = acta as Record<string, unknown>;
      const recintoId = a.recinto_id as string;
      const colegioId = a.colegio_id as string;
      const createdAt = a.created_at as string;

      const existing = actasByRecinto.get(recintoId);
      if (existing) {
        existing.colegioIds.add(colegioId);
        if (createdAt > existing.lastUpdate) {
          existing.lastUpdate = createdAt;
        }
      } else {
        actasByRecinto.set(recintoId, {
          colegioIds: new Set([colegioId]),
          lastUpdate: createdAt,
        });
      }
    }

    // Build result
    const result = (recintosData ?? [])
      .map((recinto) => {
        const r = recinto as Record<string, unknown>;
        const recintoId = r.id as string;
        const colegios = (r.colegios as Array<Record<string, unknown>>) ?? [];
        const totalColegios = colegios.length;

        const actaInfo = actasByRecinto.get(recintoId);
        const colegiosReportados = actaInfo?.colegioIds.size ?? 0;

        return {
          recinto_id: recintoId,
          recinto_nombre: r.nombre as string,
          total_colegios: totalColegios,
          colegios_reportados: colegiosReportados,
          porcentaje:
            totalColegios > 0
              ? Math.round((colegiosReportados / totalColegios) * 100)
              : 0,
          last_update: actaInfo?.lastUpdate ?? null,
        };
      })
      .filter((r) => r.total_colegios > 0);

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Error in dashboard precinct-progress:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
