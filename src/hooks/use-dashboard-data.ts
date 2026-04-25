'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { usePollingFallback } from './use-polling-fallback';
import type {
  DashboardSummary,
  PartyVoteData,
  TimelineDataPoint,
  RecintoTurnout,
  CandidateVoteData,
  PrecinctProgress,
  DashboardFilters,
} from '@/types/dashboard';

interface UseDashboardDataOptions {
  /**
   * The electoral period ID. Required.
   */
  periodoId: string;

  /**
   * Whether this is the active (live) period.
   * If false, Realtime and polling are disabled (read-only historical mode).
   */
  isActivePeriod: boolean;

  /**
   * Dashboard filter state.
   */
  filters: DashboardFilters;
}

interface DashboardData {
  summary: DashboardSummary | null;
  partyVotes: PartyVoteData[];
  timeline: TimelineDataPoint[];
  turnout: RecintoTurnout[];
  candidateVotes: CandidateVoteData[];
  precinctProgress: PrecinctProgress[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Debounce delay after receiving a Realtime event before refetching.
 * Batches rapid sequential events (e.g., multiple votes saved at once).
 */
const REFETCH_DEBOUNCE_MS = 500;

/**
 * Orchestrator hook for the election-night dashboard.
 *
 * Combines:
 *   - Data fetching from 4 dashboard API endpoints
 *   - Supabase Realtime subscription (for active periods)
 *   - Polling fallback (when Realtime fails)
 *   - Debounced refetch on Realtime events
 *   - Filter-based data refresh
 */
export function useDashboardData({
  periodoId,
  isActivePeriod,
  filters,
}: UseDashboardDataOptions): DashboardData {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [partyVotes, setPartyVotes] = useState<PartyVoteData[]>([]);
  const [timeline, setTimeline] = useState<TimelineDataPoint[]>([]);
  const [turnout, setTurnout] = useState<RecintoTurnout[]>([]);
  const [candidateVotes, setCandidateVotes] = useState<CandidateVoteData[]>([]);
  const [precinctProgress, setPrecinctProgress] = useState<PrecinctProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Data Fetching ----

  const fetchAllData = useCallback(async () => {
    if (!periodoId) return;

    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('periodo_id', periodoId);
      if (filters.circunscripcion_id) {
        params.set('circunscripcion_id', filters.circunscripcion_id);
      }
      if (filters.municipio_id) {
        params.set('municipio_id', filters.municipio_id);
      }
      if (filters.recinto_id) {
        params.set('recinto_id', filters.recinto_id);
      }

      const filterQS = params.toString();

      // Summary does not use geographic filters (global totals)
      const summaryParams = new URLSearchParams();
      summaryParams.set('periodo_id', periodoId);

      const [summaryRes, partyRes, timelineRes, turnoutRes, candidateRes, progressRes] =
        await Promise.all([
          fetch(`/api/electoral/dashboard/summary?${summaryParams.toString()}`),
          fetch(`/api/electoral/dashboard/by-party?${filterQS}`),
          fetch(
            `/api/electoral/dashboard/timeline?${summaryParams.toString()}&interval_minutes=30`
          ),
          fetch(
            `/api/electoral/dashboard/turnout?${summaryParams.toString()}${
              filters.recinto_id
                ? `&recinto_id=${filters.recinto_id}`
                : ''
            }`
          ),
          fetch(`/api/electoral/dashboard/by-candidate?${summaryParams.toString()}`),
          fetch(`/api/electoral/dashboard/precinct-progress?${summaryParams.toString()}`),
        ]);

      const [summaryJson, partyJson, timelineJson, turnoutJson, candidateJson, progressJson] =
        await Promise.all([
          summaryRes.json(),
          partyRes.json(),
          timelineRes.json(),
          turnoutRes.json(),
          candidateRes.json(),
          progressRes.json(),
        ]);

      if (summaryRes.ok) {
        setSummary(summaryJson.data ?? null);
      }
      if (partyRes.ok) {
        setPartyVotes(partyJson.data ?? []);
      }
      if (timelineRes.ok) {
        setTimeline(timelineJson.data ?? []);
      }
      if (turnoutRes.ok) {
        setTurnout(turnoutJson.data ?? []);
      }
      if (candidateRes.ok) {
        setCandidateVotes(candidateJson.data ?? []);
      }
      if (progressRes.ok) {
        setPrecinctProgress(progressJson.data ?? []);
      }

      // Report first error found
      if (!summaryRes.ok) {
        setError(summaryJson.error ?? 'Error al cargar resumen');
      } else if (!partyRes.ok) {
        setError(partyJson.error ?? 'Error al cargar votos por partido');
      } else if (!timelineRes.ok) {
        setError(timelineJson.error ?? 'Error al cargar linea de tiempo');
      } else if (!turnoutRes.ok) {
        setError(turnoutJson.error ?? 'Error al cargar participacion');
      } else if (!candidateRes.ok) {
        setError(candidateJson.error ?? 'Error al cargar votos por candidato');
      } else if (!progressRes.ok) {
        setError(progressJson.error ?? 'Error al cargar progreso por recinto');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Error de conexion al cargar datos del dashboard');
    }
  }, [periodoId, filters]);

  /**
   * Debounced refetch: waits REFETCH_DEBOUNCE_MS after the last Realtime event
   * before issuing API calls. Batches rapid updates.
   */
  const debouncedRefetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchAllData();
    }, REFETCH_DEBOUNCE_MS);
  }, [fetchAllData]);

  // ---- Realtime ----

  const { reconnect } = useRealtimeSubscription({
    periodoId,
    enabled: isActivePeriod,
    onVoteChange: debouncedRefetch,
    onActaInsert: debouncedRefetch,
  });

  // ---- Polling Fallback ----

  usePollingFallback({
    enabled: isActivePeriod,
    onPoll: fetchAllData,
    onReconnectAttempt: reconnect,
  });

  // ---- Initial Load & Filter Changes ----

  useEffect(() => {
    if (!periodoId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchAllData().finally(() => setIsLoading(false));
  }, [fetchAllData, periodoId]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    summary,
    partyVotes,
    timeline,
    turnout,
    candidateVotes,
    precinctProgress,
    isLoading,
    error,
  };
}
