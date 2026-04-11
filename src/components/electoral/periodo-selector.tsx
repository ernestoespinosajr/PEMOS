'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SelectNative } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import type { PeriodoElectoralListItem } from '@/types/electoral';

interface PeriodoSelectorProps {
  value: string;
  onChange: (periodoId: string) => void;
  /** If true, auto-select the active periodo on mount */
  autoSelectActive?: boolean;
  /** Optional label override */
  label?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Dropdown to select an electoral period.
 * Fetches periodos_electorales and renders them in a native select.
 * If autoSelectActive is true (default), selects the first active periodo on mount.
 */
export function PeriodoSelector({
  value,
  onChange,
  autoSelectActive = true,
  label = 'Periodo Electoral',
  className,
  disabled,
}: PeriodoSelectorProps) {
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
          const partido = r.partidos as { nombre: string; siglas: string } | null;
          return {
            ...(r as unknown as PeriodoElectoralListItem),
            partido_nombre: partido?.nombre ?? null,
            partido_siglas: partido?.siglas ?? null,
          };
        });

        setPeriodos(items);

        // Auto-select the first active periodo if no value is set
        if (autoSelectActive && !value) {
          const active = items.find((p) => p.activo);
          if (active) {
            onChange(active.id);
          } else if (items.length > 0) {
            onChange(items[0]!.id);
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

  if (loading) {
    return (
      <div className={className}>
        <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
        <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Cargando periodos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <SelectNative
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Seleccionar periodo"
        disabled={disabled}
      >
        {periodos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
            {p.activo ? ' (Activo)' : ''}
            {p.partido_siglas ? ` - ${p.partido_siglas}` : ''}
          </option>
        ))}
      </SelectNative>
    </div>
  );
}
