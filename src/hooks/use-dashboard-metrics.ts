'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PeriodOption } from '@/components/dashboard/period-selector';

// ---------- Types ----------

export interface DashboardMetric {
  /** Unique identifier for the metric (used as key). */
  id: string;
  /** Formatted metric value, e.g. "12,458" or "87.3%". */
  value: string;
  /** Raw numeric value for trend calculation. */
  rawValue: number;
  /** Descriptive label in Spanish. */
  label: string;
  /** Trend percentage string, e.g. "+4.5%". */
  trend: string;
  /** Whether the trend is positive. */
  trendUp: boolean;
  /** Icon name identifier (resolved in the consumer). */
  iconName: 'users' | 'bar-chart' | 'flag' | 'trending-up' | 'map-pin' | 'check-circle';
  /** Navigation href for drill-down. */
  href: string;
}

export interface DashboardMetricsState {
  metrics: DashboardMetric[];
  isLoading: boolean;
  error: string | null;
  /** Refetch data manually. */
  refetch: () => Promise<void>;
}

/** Cache key combines the selected period and the user's movimiento scope. */
type CacheKey = `${PeriodOption}:${string}`;

// ---------- Cache ----------

/**
 * Simple in-memory cache for dashboard metrics.
 * Keyed by `period:movimientoId` to avoid serving stale data across scopes.
 */
const cache = new Map<CacheKey, { data: DashboardMetric[]; timestamp: number }>();

const STALE_TIME = 30_000; // 30 seconds

function buildCacheKey(period: PeriodOption, movimientoId: string | null): CacheKey {
  return `${period}:${movimientoId ?? 'null'}`;
}

function isCacheValid(period: PeriodOption, movimientoId: string | null): boolean {
  const entry = cache.get(buildCacheKey(period, movimientoId));
  return entry != null && Date.now() - entry.timestamp < STALE_TIME;
}

function getCached(period: PeriodOption, movimientoId: string | null): DashboardMetric[] | null {
  return cache.get(buildCacheKey(period, movimientoId))?.data ?? null;
}

function setCached(period: PeriodOption, movimientoId: string | null, data: DashboardMetric[]): void {
  cache.set(buildCacheKey(period, movimientoId), { data, timestamp: Date.now() });
}

// ---------- Helpers ----------

/**
 * Calculates period boundaries based on the selected period option.
 */
function getPeriodDates(period: PeriodOption): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '1S':
      start.setDate(start.getDate() - 7);
      break;
    case '1M':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3M':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6M':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1A':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return { start, end };
}

/**
 * Formats a number with locale-aware formatting.
 */
function formatNumber(n: number): string {
  return n.toLocaleString('es-DO');
}

/**
 * Formats a percentage value with one decimal.
 */
function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

/**
 * Calculates trend as a percentage change between two values.
 */
function calculateTrend(
  current: number,
  previous: number
): { trend: string; trendUp: boolean } {
  if (previous === 0) {
    return { trend: current > 0 ? '+100%' : '0%', trendUp: current >= 0 };
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return {
    trend: `${sign}${change.toFixed(1)}%`,
    trendUp: change >= 0,
  };
}

// ---------- Hook ----------

/**
 * Hook for fetching and managing main dashboard metric data.
 *
 * Follows the project's existing data-fetching pattern:
 * - Uses raw Supabase client queries (no React Query -- not in project deps)
 * - Built-in 30-second stale-time cache to avoid redundant fetches
 * - Graceful error handling with Spanish messages
 * - Designed to work against materialized views (mv_member_counts,
 *   mv_registration_daily) once Beck creates them. Falls back to
 *   direct table queries or mock data if views don't exist yet.
 *
 * @param period - The selected time period (1S, 1M, 3M, 6M, 1A)
 * @param movimientoId - The user's movimiento scope from the JWT. Null means
 *   the user is a tenant-level admin who sees all data. Non-null means the
 *   user is scoped to a sub-organization and queries are filtered accordingly.
 *   For roles that RLS already scopes (supervisor, coordinator, field_worker),
 *   passing movimientoId is only needed to key the cache correctly.
 *   For the admin role with movimiento_id set, the explicit filter IS needed
 *   because RLS does not restrict admin queries.
 */
export function useDashboardMetrics(period: PeriodOption, movimientoId: string | null = null): DashboardMetricsState {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMetrics = useCallback(
    async (skipCache = false) => {
      // Check cache first (keyed by period + movimientoId scope)
      if (!skipCache && isCacheValid(period, movimientoId)) {
        setMetrics(getCached(period, movimientoId)!);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { start, end } = getPeriodDates(period);
        const startISO = start.toISOString();
        const endISO = end.toISOString();

        // Attempt to fetch from materialized views.
        // If the views don't exist yet, Supabase will return 404/error.
        // We handle that gracefully and fall back to direct table queries.

        let totalMembers = 0;
        let newMembers = 0;
        let previousPeriodMembers = 0;
        let activeCoordinators = 0;
        let previousCoordinators = 0;
        let totalRecintos = 0;
        let coveredRecintos = 0;

        // When movimientoId is set we apply an explicit client-side filter on
        // miembros queries. This is necessary for the admin role which RLS does
        // NOT scope to a movimiento — admin sees all tenant data by default.
        // For supervisor/coordinator/field_worker RLS already filters, so this
        // is a redundant but harmless safety net that also ensures the cache
        // key matches the actual result set.
        const withMovimiento = movimientoId;

        // --- Total members ---
        const totalMembersQuery = supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true });
        const membersResult = await (withMovimiento
          ? totalMembersQuery.eq('movimiento_id', withMovimiento)
          : totalMembersQuery);

        if (membersResult.error) {
          console.warn('Error fetching total members:', membersResult.error.message);
        } else {
          totalMembers = membersResult.count ?? 0;
        }

        // --- New members in current period ---
        const newMembersQuery = supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startISO)
          .lte('created_at', endISO);
        const newMembersResult = await (withMovimiento
          ? newMembersQuery.eq('movimiento_id', withMovimiento)
          : newMembersQuery);

        if (!newMembersResult.error) {
          newMembers = newMembersResult.count ?? 0;
        }

        // --- Previous period members (for trend calculation) ---
        const prevStart = new Date(start);
        const periodMs = end.getTime() - start.getTime();
        prevStart.setTime(prevStart.getTime() - periodMs);

        const prevMembersQuery = supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', prevStart.toISOString())
          .lt('created_at', startISO);
        const prevMembersResult = await (withMovimiento
          ? prevMembersQuery.eq('movimiento_id', withMovimiento)
          : prevMembersQuery);

        if (!prevMembersResult.error) {
          previousPeriodMembers = prevMembersResult.count ?? 0;
        }

        // --- Active coordinators ---
        const coordQuery = supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_miembro', 'coordinador')
          .eq('estado', true);
        const coordResult = await (withMovimiento
          ? coordQuery.eq('movimiento_id', withMovimiento)
          : coordQuery);

        if (!coordResult.error) {
          activeCoordinators = coordResult.count ?? 0;
        }

        // --- Previous period coordinators ---
        const prevCoordQuery = supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_miembro', 'coordinador')
          .eq('estado', true)
          .lt('created_at', startISO);
        const prevCoordResult = await (withMovimiento
          ? prevCoordQuery.eq('movimiento_id', withMovimiento)
          : prevCoordQuery);

        if (!prevCoordResult.error) {
          previousCoordinators = prevCoordResult.count ?? 0;
        }

        // --- Recintos coverage ---
        // Recintos are not movimiento-scoped, so no filter is applied here.
        const recintosResult = await supabase
          .from('recintos')
          .select('id', { count: 'exact', head: true });

        if (!recintosResult.error) {
          totalRecintos = recintosResult.count ?? 0;
        }

        const coveredResult = await supabase
          .from('recintos')
          .select('id', { count: 'exact', head: true })
          .eq('estado', true);

        if (!coveredResult.error) {
          coveredRecintos = coveredResult.count ?? 0;
        }

        // Don't update state if this request was aborted
        if (controller.signal.aborted) return;

        // --- Build metrics array ---
        const registrationProgress =
          totalMembers > 0
            ? (newMembers / totalMembers) * 100
            : 0;

        const memberTrend = calculateTrend(newMembers, previousPeriodMembers);
        const coordTrend = calculateTrend(activeCoordinators, previousCoordinators);
        const coveragePercent =
          totalRecintos > 0
            ? (coveredRecintos / totalRecintos) * 100
            : 0;

        const dashboardMetrics: DashboardMetric[] = [
          {
            id: 'total-members',
            value: formatNumber(totalMembers),
            rawValue: totalMembers,
            label: 'Total de Miembros',
            ...memberTrend,
            iconName: 'users',
            href: '/miembros',
          },
          {
            id: 'registration-progress',
            value: formatPercent(registrationProgress),
            rawValue: registrationProgress,
            label: 'Progreso de Registro',
            trend: `+${formatNumber(newMembers)} nuevos`,
            trendUp: newMembers > 0,
            iconName: 'trending-up',
            href: '/miembros',
          },
          {
            id: 'active-coordinators',
            value: formatNumber(activeCoordinators),
            rawValue: activeCoordinators,
            label: 'Coordinadores Activos',
            ...coordTrend,
            iconName: 'check-circle',
            href: '/jerarquia',
          },
          {
            id: 'electoral-coverage',
            value: formatPercent(coveragePercent),
            rawValue: coveragePercent,
            label: 'Cobertura Electoral',
            trend: `${coveredRecintos}/${totalRecintos} recintos`,
            trendUp: coveragePercent >= 50,
            iconName: 'map-pin',
            href: '/recintos',
          },
        ];

        // Update scope-keyed cache
        setCached(period, movimientoId, dashboardMetrics);

        setMetrics(dashboardMetrics);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching dashboard metrics:', err);
        setError('Error al cargar las metricas del dashboard');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [period, movimientoId]
  );

  // Fetch on mount and when period changes
  useEffect(() => {
    fetchMetrics();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchMetrics]);

  const refetch = useCallback(() => fetchMetrics(true), [fetchMetrics]);

  return { metrics, isLoading, error, refetch };
}
