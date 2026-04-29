'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PeriodOption } from '@/components/dashboard/period-selector';

// ---------- Types ----------

export interface DistributionSlice {
  /** Display label in Spanish. */
  name: string;
  /** Count of members in this category. */
  value: number;
  /** Percentage of total (0-100). */
  percentage: number;
  /** Chart fill color. */
  color: string;
}

export interface DistributionChartDataState {
  data: DistributionSlice[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ---------- Constants ----------

/** Spanish labels for tipo_miembro values. */
const ROLE_LABELS: Record<string, string> = {
  coordinador: 'Coordinadores',
  multiplicador: 'Multiplicadores',
  relacionado: 'Relacionados',
};

/** Green palette colors mapped to each role. */
const ROLE_COLORS: Record<string, string> = {
  coordinador: '#2D6A4F',     // primary
  multiplicador: '#40916C',   // primary-light
  relacionado: '#B7E4C7',     // primary-100
};

// ---------- Cache ----------

/** Keyed by movimientoId (or 'null') to prevent cross-scope cache hits. */
const cache = new Map<string, { data: DistributionSlice[]; timestamp: number }>();

const STALE_TIME = 30_000; // 30 seconds

function cacheKey(movimientoId: string | null): string {
  return movimientoId ?? 'null';
}

function isCacheValid(movimientoId: string | null): boolean {
  const entry = cache.get(cacheKey(movimientoId));
  return entry != null && Date.now() - entry.timestamp < STALE_TIME;
}

// ---------- Hook ----------

/**
 * Hook for fetching member distribution by role (tipo_miembro).
 *
 * Follows the project's data-fetching pattern:
 * - Uses raw Supabase client queries (no React Query)
 * - Built-in 30-second stale-time cache
 * - Graceful error handling with Spanish messages
 * - Queries member counts by tipo_miembro
 *
 * @param _period - The selected time period (included for API consistency)
 * @param movimientoId - The user's movimiento scope from JWT. Non-null for
 *   scoped users; null for tenant-wide admins.
 */
export function useDistributionChartData(
  _period: PeriodOption,
  movimientoId: string | null = null
): DistributionChartDataState {
  const [data, setData] = useState<DistributionSlice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!skipCache && isCacheValid(movimientoId)) {
        setData(cache.get(cacheKey(movimientoId))!.data);
        setIsLoading(false);
        setError(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const tipos = ['coordinador', 'multiplicador', 'relacionado'] as const;

        // Fetch counts for each tipo_miembro in parallel.
        // Apply movimientoId filter for scoped admins (RLS doesn't scope admin).
        const results = await Promise.all(
          tipos.map((tipo) => {
            const q = supabase
              .from('miembros')
              .select('id', { count: 'exact', head: true })
              .eq('tipo_miembro', tipo)
              .eq('estado', true);
            return movimientoId ? q.eq('movimiento_id', movimientoId) : q;
          })
        );

        if (controller.signal.aborted) return;

        const counts = tipos.map((tipo, i) => ({
          tipo,
          count: results[i]?.count ?? 0,
        }));

        const total = counts.reduce((sum, c) => sum + c.count, 0);

        const chartData: DistributionSlice[] = counts.map((c) => ({
          name: ROLE_LABELS[c.tipo] ?? c.tipo,
          value: c.count,
          percentage: total > 0 ? Math.round((c.count / total) * 1000) / 10 : 0,
          color: ROLE_COLORS[c.tipo] ?? '#2D6A4F',
        }));

        // Update scope-keyed cache
        cache.set(cacheKey(movimientoId), { data: chartData, timestamp: Date.now() });

        setData(chartData);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching distribution chart data:', err);
        setError('Error al cargar datos de distribucion');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- _period and movimientoId included to refetch on change
    [_period, movimientoId]
  );

  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, isLoading, error, refetch };
}
