import { create } from 'zustand';
import type { ConnectionStatus } from '@/types/dashboard';

/**
 * Maximum reconnection attempts before switching to polling fallback.
 */
export const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Polling interval in milliseconds when in fallback mode.
 */
export const POLLING_INTERVAL_MS = 10_000;

/**
 * Maximum backoff delay cap in milliseconds.
 */
export const MAX_BACKOFF_MS = 30_000;

/**
 * Calculates exponential backoff delay: 1s, 2s, 4s, 8s, 16s, 30s (cap).
 */
export function calculateBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), MAX_BACKOFF_MS);
}

// ---------- Store ----------

interface ConnectionState {
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastEventAt: Date | null;

  setConnected: () => void;
  setReconnecting: () => void;
  setPolling: () => void;
  setDisconnected: () => void;
  incrementAttempts: () => void;
  resetAttempts: () => void;
  setLastEvent: (date: Date) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  reconnectAttempts: 0,
  lastEventAt: null,

  setConnected: () =>
    set({ status: 'connected', reconnectAttempts: 0 }),

  setReconnecting: () =>
    set({ status: 'reconnecting' }),

  setPolling: () =>
    set({ status: 'polling' }),

  setDisconnected: () =>
    set({ status: 'disconnected' }),

  incrementAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

  resetAttempts: () =>
    set({ reconnectAttempts: 0 }),

  setLastEvent: (date: Date) =>
    set({ lastEventAt: date }),
}));
