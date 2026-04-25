import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/electoral/votos/[id]
 *
 * Update the vote count for a single candidato_votos record.
 * Also recalculates partido_votos for the affected colegio.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { id } = params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 });
  }

  const { votos } = body as { votos?: number };

  if (votos == null || typeof votos !== 'number' || votos < 0) {
    return NextResponse.json(
      { error: 'votos es requerido y debe ser un numero >= 0' },
      { status: 400 }
    );
  }

  if (!Number.isInteger(votos)) {
    return NextResponse.json(
      { error: 'votos debe ser un numero entero' },
      { status: 400 }
    );
  }

  // Update the vote record
  const { data, error } = await supabase
    .from('candidato_votos')
    .update({ votos, updated_by: user.id } as Database['public']['Tables']['candidato_votos']['Update'])
    .eq('id', id)
    .select('*, candidatos(partido_id, orden)')
    .single();

  if (error) {
    console.error('Error updating voto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar voto' },
      { status: 500 }
    );
  }

  // Recalculate partido_votos for this colegio
  // This aggregates all candidate votes by party for the colegio
  const r = data as Record<string, unknown>;
  const colegioId = r.colegio_id as string;
  const recintoId = r.recinto_id as string;
  const periodoId = r.periodo_id as string;
  const partidoId = r.partido_id as string;

  try {
    // Get all candidate votes for this colegio grouped by partido
    const { data: allVotes } = await supabase
      .from('candidato_votos')
      .select('candidatos(partido_id, orden), votos')
      .eq('colegio_id', colegioId)
      .eq('periodo_id', periodoId)
      .eq('estado', true)
      .order('created_at', { ascending: true });

    if (allVotes) {
      // Group by partido_id
      const partyVotes: Record<
        string,
        { partido_ref_id: number; votes: number[] }
      > = {};

      for (const v of allVotes) {
        const vr = v as Record<string, unknown>;
        const cand = vr.candidatos as {
          partido_id: string;
          orden: number;
        } | null;
        if (!cand) continue;

        const key = cand.partido_id;
        if (!partyVotes[key]) {
          partyVotes[key] = { partido_ref_id: 0, votes: [] };
        }
        partyVotes[key].votes.push(vr.votos as number);
      }

      // Upsert partido_votos for each party
      for (const [_candPartidoId, pv] of Object.entries(partyVotes)) {
        const votes = pv.votes;
        const upsertData: Database['public']['Tables']['partido_votos']['Insert'] = {
          recinto_id: recintoId,
          colegio_id: colegioId,
          partido_ref_id: 0, // We use 0 as default ref
          periodo_id: periodoId,
          partido_id: partidoId,
          tenant_id: r.tenant_id as string | null,
          candidato_1_votos: votes[0] ?? 0,
          candidato_2_votos: votes[1] ?? 0,
          candidato_3_votos: votes[2] ?? 0,
          candidato_4_votos: votes[3] ?? 0,
          candidato_5_votos: votes[4] ?? 0,
          candidato_6_votos: votes[5] ?? 0,
        };

        // Try to upsert
        await supabase.from('partido_votos').upsert(upsertData, {
          onConflict: 'recinto_id,colegio_id,partido_ref_id,periodo_id',
        });
      }
    }
  } catch (err) {
    // Log but don't fail the main request
    console.error('Error recalculating partido_votos:', err);
  }

  return NextResponse.json({ data: { ...r, candidatos: undefined } });
}
