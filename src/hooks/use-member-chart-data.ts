'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PeriodOption } from '@/components/dashboard/period-selector';

// ---------- Types ----------

export interface MemberCountByLevel {
  /** Geographic level identifier (e.g., provincia name). */
  name: string;
  /** Total member count at this level. */
  total: number;
  /** Coordinadores count. */
  coordinadores: number;
  /** Multiplicadores count. */
  multiplicadores: number;
  /** Relacionados count. */
  relacionados: number;
}

export interface MemberChartDataState {
  data: MemberCountByLevel[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ---------- Cache ----------

/** Keyed by movimientoId (or 'null') so scoped and unscoped users don't share cached data. */
const cache = new Map<string, { data: MemberCountByLevel[]; timestamp: number }>();

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
 * Hook for fetching member count data grouped by geographic level.
 *
 * Follows the project's data-fetching pattern:
 * - Uses raw Supabase client queries (no React Query -- not in project deps)
 * - Built-in 30-second stale-time cache
 * - Graceful error handling with Spanish messages
 * - Attempts RPC `get_member_counts` first, falls back to direct table query
 *
 * @param _period - The selected time period (unused for geographic counts, included for API consistency)
 * @param movimientoId - The user's movimiento scope from JWT. Non-null for
 *   scoped users; null for tenant-wide admins. Used as part of the cache key
 *   and to apply an explicit filter for admin-role users (whom RLS does not scope).
 */
export function useMemberChartData(_period: PeriodOption, movimientoId: string | null = null): MemberChartDataState {
  const [data, setData] = useState<MemberCountByLevel[]>([]);
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
        let chartData: MemberCountByLevel[] = [];

        // Try RPC function first (materialized view with security wrapper).
        // Pass movimientoId so the RPC can scope its aggregation when the
        // calling user is a scoped admin (for other roles RLS handles it).
        // The RPC may not be in the generated types yet -- cast to bypass strict typing.
        const rpcResult = await (supabase.rpc as CallableFunction)(
          'get_member_counts',
          { p_nivel: 'provincia', p_movimiento_id: movimientoId ?? null }
        );

        if (!rpcResult.error && rpcResult.data && Array.isArray(rpcResult.data)) {
          chartData = (
            rpcResult.data as Array<{
              geo_nombre: string;
              total_miembros: number;
              coordinadores: number;
              multiplicadores: number;
              relacionados: number;
            }>
          ).map((row) => ({
            name: row.geo_nombre,
            total: row.total_miembros,
            coordinadores: row.coordinadores,
            multiplicadores: row.multiplicadores,
            relacionados: row.relacionados,
          }));
        } else {
          // Fallback: direct query grouping by tipo_miembro per provincia
          console.warn(
            'RPC get_member_counts unavailable, falling back to direct query:',
            rpcResult.error?.message
          );

          // Get all members with joined provincia name
          const joinQuery = supabase
            .from('miembros')
            .select(
              `
              tipo_miembro,
              sectores!inner (
                circunscripciones!inner (
                  municipios!inner (
                    provincias!inner ( nombre )
                  )
                )
              )
            `
            )
            .eq('estado', true);
          const { data: members, error: membersError } = await (movimientoId
            ? joinQuery.eq('movimiento_id', movimientoId)
            : joinQuery);

          if (membersError) {
            // Final fallback: aggregate by tipo_miembro only (no geographic breakdown)
            console.warn('Join query failed, using simple aggregation:', membersError.message);

            const levels = ['Coordinadores', 'Multiplicadores', 'Relacionados'];
            const tipos = ['coordinador', 'multiplicador', 'relacionado'] as const;

            const counts = await Promise.all(
              tipos.map((tipo) => {
                const q = supabase
                  .from('miembros')
                  .select('id', { count: 'exact', head: true })
                  .eq('tipo_miembro', tipo)
                  .eq('estado', true);
                return movimientoId ? q.eq('movimiento_id', movimientoId) : q;
              })
            );

            chartData = levels.map((name, i) => ({
              name,
              total: counts[i]?.count ?? 0,
              coordinadores: name === 'Coordinadores' ? (counts[i]?.count ?? 0) : 0,
              multiplicadores: name === 'Multiplicadores' ? (counts[i]?.count ?? 0) : 0,
              relacionados: name === 'Relacionados' ? (counts[i]?.count ?? 0) : 0,
            }));
          } else if (members) {
            // Group by provincia name
            const grouped: Record<
              string,
              { total: number; coordinadores: number; multiplicadores: number; relacionados: number }
            > = {};

            for (const m of members as Array<{
              tipo_miembro: string;
              sectores: {
                circunscripciones: {
                  municipios: {
                    provincias: { nombre: string };
                  };
                };
              };
            }>) {
              const provName =
                m.sectores?.circunscripciones?.municipios?.provincias?.nombre ?? 'Sin Provincia';

              if (!grouped[provName]) {
                grouped[provName] = {
                  total: 0,
                  coordinadores: 0,
                  multiplicadores: 0,
                  relacionados: 0,
                };
              }

              grouped[provName].total += 1;
              if (m.tipo_miembro === 'coordinador') grouped[provName].coordinadores += 1;
              else if (m.tipo_miembro === 'multiplicador') grouped[provName].multiplicadores += 1;
              else grouped[provName].relacionados += 1;
            }

            chartData = Object.entries(grouped)
              .map(([name, counts]) => ({ name, ...counts }))
              .sort((a, b) => b.total - a.total);
          }
        }

        if (controller.signal.aborted) return;

        // Update scope-keyed cache
        cache.set(cacheKey(movimientoId), { data: chartData, timestamp: Date.now() });

        setData(chartData);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching member chart data:', err);
        setError('Error al cargar datos del grafico de miembros');
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
