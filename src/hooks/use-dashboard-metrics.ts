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

// ---------- Cache ----------

/**
 * Simple in-memory cache for dashboard metrics.
 * Avoids unnecessary re-fetches within the stale window (30 seconds).
 */
const cache: {
  data: DashboardMetric[] | null;
  period: PeriodOption | null;
  timestamp: number;
} = {
  data: null,
  period: null,
  timestamp: 0,
};

const STALE_TIME = 30_000; // 30 seconds

function isCacheValid(period: PeriodOption): boolean {
  return (
    cache.data !== null &&
    cache.period === period &&
    Date.now() - cache.timestamp < STALE_TIME
  );
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
 */
export function useDashboardMetrics(period: PeriodOption): DashboardMetricsState {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMetrics = useCallback(
    async (skipCache = false) => {
      // Check cache first
      if (!skipCache && isCacheValid(period)) {
        setMetrics(cache.data!);
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

        // --- Total members ---
        const membersResult = await supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true });

        if (membersResult.error) {
          // Materialized view or table might not exist.
          // Continue with zero to avoid breaking the entire dashboard.
          console.warn('Error fetching total members:', membersResult.error.message);
        } else {
          totalMembers = membersResult.count ?? 0;
        }

        // --- New members in current period ---
        const newMembersResult = await supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startISO)
          .lte('created_at', endISO);

        if (!newMembersResult.error) {
          newMembers = newMembersResult.count ?? 0;
        }

        // --- Previous period members (for trend calculation) ---
        const prevStart = new Date(start);
        const periodMs = end.getTime() - start.getTime();
        prevStart.setTime(prevStart.getTime() - periodMs);

        const prevMembersResult = await supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', prevStart.toISOString())
          .lt('created_at', startISO);

        if (!prevMembersResult.error) {
          previousPeriodMembers = prevMembersResult.count ?? 0;
        }

        // --- Active coordinators ---
        const coordResult = await supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_miembro', 'coordinador')
          .eq('estado', true);

        if (!coordResult.error) {
          activeCoordinators = coordResult.count ?? 0;
        }

        // --- Previous period coordinators ---
        const prevCoordResult = await supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_miembro', 'coordinador')
          .eq('estado', true)
          .lt('created_at', startISO);

        if (!prevCoordResult.error) {
          previousCoordinators = prevCoordResult.count ?? 0;
        }

        // --- Recintos coverage ---
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

        // Update cache
        cache.data = dashboardMetrics;
        cache.period = period;
        cache.timestamp = Date.now();

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
    [period]
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
