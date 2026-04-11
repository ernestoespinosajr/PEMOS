'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  useConnectionStore,
  calculateBackoff,
  MAX_RECONNECT_ATTEMPTS,
} from '@/stores/connection-store';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  /**
   * The electoral period ID to scope the subscription.
   */
  periodoId: string;

  /**
   * Whether realtime is enabled (disabled for historical periods).
   */
  enabled?: boolean;

  /**
   * Callback fired when a candidato_votos row changes.
   */
  onVoteChange?: () => void;

  /**
   * Callback fired when a new acta is inserted.
   */
  onActaInsert?: () => void;
}

/**
 * Supabase Realtime subscription hook with exponential backoff reconnection.
 *
 * Subscribes to:
 *   - candidato_votos: UPDATE events
 *   - actas: INSERT events
 *
 * On connection failure, retries with exponential backoff (1s, 2s, 4s, 8s, 16s, 30s cap).
 * After MAX_RECONNECT_ATTEMPTS (3) failures, transitions to polling mode.
 * Connection state is managed via the global Zustand connection store.
 */
export function useRealtimeSubscription({
  periodoId,
  enabled = true,
  onVoteChange,
  onActaInsert,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const {
    setConnected,
    setReconnecting,
    setPolling,
    setDisconnected,
    incrementAttempts,
    resetAttempts,
    setLastEvent,
    reconnectAttempts,
    status,
  } = useConnectionStore();

  // Keep callbacks fresh without re-subscribing
  const onVoteChangeRef = useRef(onVoteChange);
  onVoteChangeRef.current = onVoteChange;
  const onActaInsertRef = useRef(onActaInsert);
  onActaInsertRef.current = onActaInsert;

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    if (!periodoId || !enabled || !isMountedRef.current) return;

    cleanup();

    const supabase = createClient();
    const channelName = `election-night-${periodoId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidato_votos',
          filter: `periodo_id=eq.${periodoId}`,
        },
        () => {
          if (isMountedRef.current) {
            setLastEvent(new Date());
            onVoteChangeRef.current?.();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'actas',
          filter: `periodo_id=eq.${periodoId}`,
        },
        () => {
          if (isMountedRef.current) {
            setLastEvent(new Date());
            onActaInsertRef.current?.();
          }
        }
      )
      .subscribe((status, err) => {
        if (!isMountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          setConnected();
          resetAttempts();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(
            `Realtime channel ${status}:`,
            err?.message ?? 'unknown error'
          );
          handleReconnect();
        } else if (status === 'CLOSED') {
          setDisconnected();
        }
      });

    channelRef.current = channel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoId, enabled]);

  const handleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    const currentAttempts = useConnectionStore.getState().reconnectAttempts;

    if (currentAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // Switch to polling mode
      setPolling();
      return;
    }

    setReconnecting();
    incrementAttempts();

    const delay = calculateBackoff(currentAttempts);

    reconnectTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        subscribe();
      }
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe]);

  // Initial subscription
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && periodoId) {
      subscribe();
    } else {
      setDisconnected();
    }

    return () => {
      isMountedRef.current = false;
      cleanup();
      setDisconnected();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoId, enabled]);

  /**
   * Manually attempt to reconnect (e.g., when transitioning back from polling).
   */
  const reconnect = useCallback(() => {
    resetAttempts();
    subscribe();
  }, [resetAttempts, subscribe]);

  return {
    reconnect,
    status,
    reconnectAttempts,
  };
}
