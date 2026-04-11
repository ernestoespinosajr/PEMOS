'use client';

import { useState, useEffect } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface AssignedColegio {
  recinto_id: string;
  recinto_nombre: string;
  recinto_cod: string;
  colegio_id: string | null;
  colegio_nombre: string | null;
  colegio_cod: string | null;
}

interface ColegioChoice {
  colegio_id: string;
  colegio_cod: string;
  colegio_nombre: string | null;
  recinto_id: string;
  recinto_nombre: string;
  recinto_cod: string;
}

interface VoteColegioSelectorProps {
  periodoId: string;
  partidoId: string;
  onSelect: (choice: {
    colegioId: string;
    recintoId: string;
    recintoNombre: string;
    colegioNombre: string;
  }) => void;
}

/**
 * Lets the observer pick a colegio to record votes for.
 * For observers: shows only assigned recintos/colegios.
 * For admins: shows all colegios.
 */
export function VoteColegioSelector({
  periodoId,
  partidoId,
  onSelect,
}: VoteColegioSelectorProps) {
  const [choices, setChoices] = useState<ColegioChoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      if (!periodoId) return;
      setLoading(true);

      try {
        const supabase = createClient();

        // First try to get assignments for the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Check user role
        const { data: dbUser } = await supabase
          .from('usuarios')
          .select('role')
          .eq('auth_user_id', user.id)
          .single();

        const role = (dbUser as Record<string, unknown>)?.role as string;

        if (role === 'admin') {
          // Admin sees all colegios
          const { data: allColegios } = await supabase
            .from('colegios')
            .select(`
              id, cod_colegio, nombre,
              recintos(id, nombre, cod_recinto)
            `)
            .eq('estado', true)
            .order('cod_colegio');

          const items: ColegioChoice[] = (allColegios ?? []).map((c) => {
            const cr = c as Record<string, unknown>;
            const recinto = cr.recintos as {
              id: string;
              nombre: string;
              cod_recinto: string;
            } | null;
            return {
              colegio_id: cr.id as string,
              colegio_cod: cr.cod_colegio as string,
              colegio_nombre: cr.nombre as string | null,
              recinto_id: recinto?.id ?? '',
              recinto_nombre: recinto?.nombre ?? '',
              recinto_cod: recinto?.cod_recinto ?? '',
            };
          });

          setChoices(items);
        } else {
          // Observer/coordinator: get assignments
          const { data: assignments } = await supabase
            .from('asignacion_recintos')
            .select(`
              recinto_id, colegio_id,
              recintos(id, nombre, cod_recinto),
              colegios(id, cod_colegio, nombre)
            `)
            .eq('usuario_id', user.id)
            .eq('periodo_id', periodoId)
            .eq('estado', true);

          if (!assignments || assignments.length === 0) {
            setChoices([]);
            setLoading(false);
            return;
          }

          const items: ColegioChoice[] = [];

          for (const a of assignments) {
            const ar = a as Record<string, unknown>;
            const recinto = ar.recintos as {
              id: string;
              nombre: string;
              cod_recinto: string;
            } | null;
            const colegio = ar.colegios as {
              id: string;
              cod_colegio: string;
              nombre: string | null;
            } | null;

            if (colegio) {
              // Specific colegio assignment
              items.push({
                colegio_id: colegio.id,
                colegio_cod: colegio.cod_colegio,
                colegio_nombre: colegio.nombre,
                recinto_id: recinto?.id ?? '',
                recinto_nombre: recinto?.nombre ?? '',
                recinto_cod: recinto?.cod_recinto ?? '',
              });
            } else if (recinto) {
              // Recinto-level assignment: list all colegios
              const { data: colegios } = await supabase
                .from('colegios')
                .select('id, cod_colegio, nombre')
                .eq('recinto_id', recinto.id)
                .eq('estado', true)
                .order('cod_colegio');

              for (const c of colegios ?? []) {
                const cr = c as Record<string, unknown>;
                items.push({
                  colegio_id: cr.id as string,
                  colegio_cod: cr.cod_colegio as string,
                  colegio_nombre: cr.nombre as string | null,
                  recinto_id: recinto.id,
                  recinto_nombre: recinto.nombre,
                  recinto_cod: recinto.cod_recinto,
                });
              }
            }
          }

          setChoices(items);
        }
      } catch (err) {
        console.error('Error fetching colegio choices:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [periodoId, partidoId]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando colegios asignados"
        />
      </div>
    );
  }

  if (choices.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface">
        <div className="text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-placeholder">
            No tienes colegios asignados para este periodo.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contacta al administrador para recibir una asignacion.
          </p>
        </div>
      </div>
    );
  }

  // Group by recinto
  const grouped: Record<string, ColegioChoice[]> = {};
  for (const c of choices) {
    const key = c.recinto_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-primary-text">
        Selecciona un colegio para registrar votos:
      </p>

      {Object.entries(grouped).map(([recintoId, colegioList]) => (
        <div key={recintoId}>
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            {colegioList[0]?.recinto_cod} - {colegioList[0]?.recinto_nombre}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {colegioList.map((c) => (
              <Card
                key={c.colegio_id}
                className="cursor-pointer shadow-sm transition-colors hover:border-primary hover:bg-primary-tint/30"
                onClick={() =>
                  onSelect({
                    colegioId: c.colegio_id,
                    recintoId: c.recinto_id,
                    recintoNombre: `${c.recinto_cod} - ${c.recinto_nombre}`,
                    colegioNombre: c.colegio_cod + (c.colegio_nombre ? ` - ${c.colegio_nombre}` : ''),
                  })
                }
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-tint">
                    <MapPin
                      size={18}
                      className="text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary-text">
                      Colegio {c.colegio_cod}
                    </p>
                    {c.colegio_nombre && (
                      <p className="text-xs text-muted-foreground">
                        {c.colegio_nombre}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
