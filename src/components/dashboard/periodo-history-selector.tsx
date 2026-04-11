'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SelectNative } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { PeriodoElectoralListItem } from '@/types/electoral';

interface PeriodoHistorySelectorProps {
  value: string;
  onChange: (periodoId: string, isActive: boolean) => void;
  className?: string;
}

/**
 * Electoral period selector that includes ALL periods (active + historical).
 *
 * Unlike PeriodoSelector which only shows active periods, this component
 * shows all periods and indicates which one is active (live) vs historical
 * (read-only). Used on the election-night dashboard to allow viewing
 * past election results.
 */
export function PeriodoHistorySelector({
  value,
  onChange,
  className,
}: PeriodoHistorySelectorProps) {
  const [periodos, setPeriodos] = useState<PeriodoElectoralListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPeriodos() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('periodos_electorales')
          .select(`
            *,
            partidos(nombre, siglas)
          `)
          .eq('estado', true)
          .order('fecha_inicio', { ascending: false });

        if (error) {
          console.error('Error fetching periodos:', error);
          return;
        }

        const items: PeriodoElectoralListItem[] = (data ?? []).map((row) => {
          const r = row as Record<string, unknown>;
          const partido = r.partidos as {
            nombre: string;
            siglas: string;
          } | null;
          return {
            ...(r as unknown as PeriodoElectoralListItem),
            partido_nombre: partido?.nombre ?? null,
            partido_siglas: partido?.siglas ?? null,
          };
        });

        setPeriodos(items);

        // Auto-select the active periodo on mount
        if (!value) {
          const active = items.find((p) => p.activo);
          if (active) {
            onChange(active.id, true);
          } else if (items.length > 0) {
            onChange(items[0]!.id, false);
          }
        }
      } catch (err) {
        console.error('Error fetching periodos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPeriodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(periodoId: string) {
    const periodo = periodos.find((p) => p.id === periodoId);
    const isActive = periodo?.activo ?? false;
    onChange(periodoId, isActive);
  }

  const selectedPeriodo = periodos.find((p) => p.id === value);
  const isHistorical = selectedPeriodo && !selectedPeriodo.activo;

  if (loading) {
    return (
      <div className={className}>
        <Label className="mb-1.5 block text-sm font-medium">
          Periodo Electoral
        </Label>
        <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Cargando periodos...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-2">
        <Label className="block text-sm font-medium">Periodo Electoral</Label>
        {isHistorical && (
          <Badge
            variant="outline"
            className="border-neutral-300 bg-neutral-50 text-xs text-neutral-600"
          >
            Solo lectura
          </Badge>
        )}
      </div>
      <SelectNative
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Seleccionar periodo"
      >
        {periodos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
            {p.activo ? ' (En Vivo)' : ''}
            {p.partido_siglas ? ` - ${p.partido_siglas}` : ''}
          </option>
        ))}
      </SelectNative>
    </div>
  );
}
