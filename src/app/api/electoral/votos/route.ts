import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/electoral/votos
 *
 * Fetch vote records for a specific colegio/periodo.
 * Returns candidato_votos joined with candidato name and partido info,
 * ordered by candidato.orden.
 */
export async function GET(request: Request) {
  const supabase = createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const colegio_id = searchParams.get('colegio_id');
  const periodo_id = searchParams.get('periodo_id');

  if (!colegio_id || !UUID_REGEX.test(colegio_id)) {
    return NextResponse.json(
      { error: 'colegio_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  if (!periodo_id || !UUID_REGEX.test(periodo_id)) {
    return NextResponse.json(
      { error: 'periodo_id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('candidato_votos')
    .select(`
      *,
      candidatos(nombre, orden, partido_id, partidos(nombre, siglas, color))
    `)
    .eq('colegio_id', colegio_id)
    .eq('periodo_id', periodo_id)
    .eq('estado', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching votos:', error);
    return NextResponse.json(
      { error: 'Error al obtener registros de votos' },
      { status: 500 }
    );
  }

  // Transform and sort by candidato.orden
  const items = (data ?? [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const candidato = r.candidatos as {
        nombre: string;
        orden: number;
        partido_id: string;
        partidos: { nombre: string; siglas: string; color: string } | null;
      } | null;

      return {
        ...r,
        candidatos: undefined,
        candidato_nombre: candidato?.nombre ?? null,
        candidato_orden: candidato?.orden ?? 999,
        partido_nombre: candidato?.partidos?.nombre ?? null,
        partido_siglas: candidato?.partidos?.siglas ?? null,
        partido_color: candidato?.partidos?.color ?? null,
      };
    })
    .sort(
      (a, b) =>
        ((a.candidato_orden as number) ?? 999) -
        ((b.candidato_orden as number) ?? 999)
    );

  return NextResponse.json({ data: items });
}
