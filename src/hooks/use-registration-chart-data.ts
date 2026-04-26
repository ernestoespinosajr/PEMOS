'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PeriodOption } from '@/components/dashboard/period-selector';

// ---------- Types ----------

export interface RegistrationDataPoint {
  /** Date string formatted for display (e.g., "10 Abr"). */
  date: string;
  /** ISO date string for sorting. */
  dateISO: string;
  /** Total registrations on this date. */
  total: number;
  /** Cumulative total up to this date. */
  cumulative: number;
}

export interface RegistrationChartDataState {
  data: RegistrationDataPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ---------- Cache ----------

const cache: {
  data: RegistrationDataPoint[] | null;
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

/** Spanish abbreviated month names. */
const MONTHS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/**
 * Formats a date string for chart axis display.
 */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

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
 * Formats a Date to YYYY-MM-DD string for Supabase queries.
 */
function toDateString(d: Date): string {
  return d.toISOString().split('T')[0] ?? '';
}

// ---------- Hook ----------

/**
 * Hook for fetching registration progress data over time.
 *
 * Follows the project's data-fetching pattern:
 * - Uses raw Supabase client queries (no React Query)
 * - Built-in 30-second stale-time cache per period
 * - Graceful error handling with Spanish messages
 * - Attempts RPC `get_registration_daily` first, falls back to direct query
 *
 * @param period - The selected time period
 */
export function useRegistrationChartData(
  period: PeriodOption
): RegistrationChartDataState {
  const [data, setData] = useState<RegistrationDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!skipCache && isCacheValid(period)) {
        setData(cache.data!);
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
        const { start, end } = getPeriodDates(period);
        const startDate = toDateString(start);
        const endDate = toDateString(end);

        let dailyCounts: Array<{ date: string; count: number }> = [];

        // Try RPC function first (materialized view with security wrapper)
        // The RPC may not be in the generated types yet -- cast to bypass strict typing
        const rpcResult = await (supabase.rpc as CallableFunction)(
          'get_registration_daily',
          { p_date_from: startDate, p_date_to: endDate }
        );

        if (
          !rpcResult.error &&
          rpcResult.data &&
          Array.isArray(rpcResult.data)
        ) {
          dailyCounts = (
            rpcResult.data as Array<{
              registration_date: string;
              total_registrations: number;
            }>
          ).map((row) => ({
            date: row.registration_date,
            count: row.total_registrations,
          }));
        } else {
          // Fallback: direct query on miembros table
          console.warn(
            'RPC get_registration_daily unavailable, falling back to direct query:',
            rpcResult.error?.message
          );

          const { data: members, error: membersError } = await supabase
            .from('miembros')
            .select('created_at')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .order('created_at', { ascending: true });

          if (membersError) {
            console.warn('Direct query failed:', membersError.message);
          } else if (members) {
            // Group by date
            const grouped: Record<string, number> = {};
            for (const m of members) {
              const dateKey = m.created_at.split('T')[0] ?? '';
              grouped[dateKey] = (grouped[dateKey] || 0) + 1;
            }

            // Fill in missing dates with zero counts
            const current = new Date(start);
            while (current <= end) {
              const key = toDateString(current);
              if (!grouped[key]) {
                grouped[key] = 0;
              }
              current.setDate(current.getDate() + 1);
            }

            dailyCounts = Object.entries(grouped)
              .map(([date, count]) => ({ date, count }))
              .sort((a, b) => a.date.localeCompare(b.date));
          }
        }

        if (controller.signal.aborted) return;

        // Build chart data with cumulative totals
        let cumulative = 0;
        const chartData: RegistrationDataPoint[] = dailyCounts.map((item) => {
          cumulative += item.count;
          return {
            date: formatDateLabel(item.date),
            dateISO: item.date,
            total: item.count,
            cumulative,
          };
        });

        // For longer periods, sample data points to avoid overcrowding the chart
        const maxPoints = period === '1S' ? 7 : period === '1M' ? 30 : 60;
        let sampledData = chartData;
        if (chartData.length > maxPoints) {
          const step = Math.ceil(chartData.length / maxPoints);
          sampledData = chartData.filter(
            (_, i) => i % step === 0 || i === chartData.length - 1
          );
        }

        // Update cache
        cache.data = sampledData;
        cache.period = period;
        cache.timestamp = Date.now();

        setData(sampledData);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching registration chart data:', err);
        setError('Error al cargar datos de registro');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [period]
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
