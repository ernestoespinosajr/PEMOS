import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/electoral/dashboard/by-candidate
 *
 * Returns vote totals grouped by candidate for the candidate comparison chart.
 * Joins candidato_votos with candidatos and partidos to include party colors.
 *
 * Query params:
 *   - periodo_id (required): UUID of the electoral period
 *
 * Response:
 *   { data: Array<CandidateVoteData> }
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
    // Query candidato_votos grouped by candidato, joined with candidatos and partidos
    const { data: votosData, error: votosError } = await supabase
      .from('candidato_votos')
      .select(`
        candidato_id,
        votos,
        candidatos(nombre, partido_id, partidos(nombre, siglas, color))
      `)
      .eq('periodo_id', periodo_id)
      .eq('estado', true);

    if (votosError) {
      console.error('Error fetching candidate votes:', votosError);
      return NextResponse.json(
        { error: 'Error al obtener votos por candidato' },
        { status: 500 }
      );
    }

    // Aggregate votes by candidate client-side
    const candidateMap = new Map<
      string,
      {
        candidato_id: string;
        candidato_nombre: string;
        partido_id: string;
        partido_nombre: string;
        partido_siglas: string | null;
        partido_color: string | null;
        total_votos: number;
      }
    >();

    for (const row of votosData ?? []) {
      const r = row as Record<string, unknown>;
      const candidatoId = r.candidato_id as string;
      const votos = (r.votos as number) ?? 0;
      const candidato = r.candidatos as Record<string, unknown> | null;
      const partido = candidato?.partidos as Record<string, unknown> | null;

      const existing = candidateMap.get(candidatoId);
      if (existing) {
        existing.total_votos += votos;
      } else {
        candidateMap.set(candidatoId, {
          candidato_id: candidatoId,
          candidato_nombre: (candidato?.nombre as string) ?? 'Sin nombre',
          partido_id: (candidato?.partido_id as string) ?? '',
          partido_nombre: (partido?.nombre as string) ?? '',
          partido_siglas: (partido?.siglas as string) ?? null,
          partido_color: (partido?.color as string) ?? null,
          total_votos: votos,
        });
      }
    }

    const candidates = Array.from(candidateMap.values());

    // Calculate total votes for percentage
    const grandTotal = candidates.reduce((sum, c) => sum + c.total_votos, 0);

    const result = candidates
      .map((c) => ({
        ...c,
        porcentaje:
          grandTotal > 0
            ? Math.round((c.total_votos / grandTotal) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.total_votos - a.total_votos);

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Error in dashboard by-candidate:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
