'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  useConnectionStore,
  POLLING_INTERVAL_MS,
} from '@/stores/connection-store';

interface UsePollingFallbackOptions {
  /**
   * Whether polling is allowed (disabled for historical periods).
   */
  enabled?: boolean;

  /**
   * Callback to refetch dashboard data during each poll cycle.
   */
  onPoll: () => void;

  /**
   * Callback to attempt Realtime reconnection from polling mode.
   * Called every 30 seconds while in polling mode.
   */
  onReconnectAttempt?: () => void;

  /**
   * Polling interval in milliseconds. Defaults to POLLING_INTERVAL_MS (10s).
   */
  intervalMs?: number;
}

/**
 * Fallback polling hook activated when Realtime connection fails.
 *
 * Activated automatically when connectionStore.status === 'polling'.
 * Polls dashboard data every 10 seconds (configurable).
 * While polling, also attempts Realtime reconnection every 30 seconds.
 */
export function usePollingFallback({
  enabled = true,
  onPoll,
  onReconnectAttempt,
  intervalMs = POLLING_INTERVAL_MS,
}: UsePollingFallbackOptions) {
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const status = useConnectionStore((s) => s.status);

  // Keep callbacks fresh
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;
  const onReconnectRef = useRef(onReconnectAttempt);
  onReconnectRef.current = onReconnectAttempt;

  const startPolling = useCallback(() => {
    // Clear any existing timers
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current);
    }

    // Start data polling
    pollingTimerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        onPollRef.current();
      }
    }, intervalMs);

    // Start periodic Realtime reconnection attempts (every 30s)
    if (onReconnectRef.current) {
      reconnectTimerRef.current = setInterval(() => {
        if (isMountedRef.current) {
          onReconnectRef.current?.();
        }
      }, 30_000);
    }
  }, [intervalMs]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearInterval(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && status === 'polling') {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [enabled, status, startPolling, stopPolling]);
}
