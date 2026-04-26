'use client';

import { useConnectionStore } from '@/stores/connection-store';
import type { ConnectionStatus } from '@/types/dashboard';

interface UseConnectionStatusReturn {
  /** Current connection status. */
  status: ConnectionStatus;
  /** Number of reconnection attempts made so far. */
  reconnectAttempts: number;
  /** Timestamp of the last received Realtime event, or null. */
  lastEventAt: Date | null;
  /** Whether the connection is active (connected or polling). */
  isLive: boolean;
  /** Human-readable Spanish label for the current status. */
  label: string;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'En vivo',
  reconnecting: 'Reconectando...',
  polling: 'Actualizacion periodica',
  disconnected: 'Desconectado',
};

/**
 * Consumer hook for the global connection status store.
 *
 * Wraps the Zustand connection store with derived values
 * (isLive, label) for use in UI components like the
 * ConnectionStatusIndicator.
 *
 * Does NOT manage the connection itself -- that is handled
 * by useRealtimeSubscription and usePollingFallback.
 */
export function useConnectionStatus(): UseConnectionStatusReturn {
  const status = useConnectionStore((s) => s.status);
  const reconnectAttempts = useConnectionStore((s) => s.reconnectAttempts);
  const lastEventAt = useConnectionStore((s) => s.lastEventAt);

  const isLive = status === 'connected' || status === 'polling';

  let label = STATUS_LABELS[status];
  if (status === 'reconnecting') {
    label = `Reconectando (${reconnectAttempts}/3)...`;
  }

  return {
    status,
    reconnectAttempts,
    lastEventAt,
    isLive,
    label,
  };
}
