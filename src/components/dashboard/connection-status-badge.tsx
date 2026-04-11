'use client';

import { useConnectionStore } from '@/stores/connection-store';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConnectionStatus } from '@/types/dashboard';
import { CONNECTION_STATUS_LABELS } from '@/types/dashboard';

const STATUS_STYLES: Record<
  ConnectionStatus,
  { dot: string; badge: string }
> = {
  connected: {
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  },
  reconnecting: {
    dot: 'bg-amber-500 animate-pulse',
    badge: 'border-amber-200 text-amber-700 bg-amber-50',
  },
  polling: {
    dot: 'bg-red-500',
    badge: 'border-red-200 text-red-700 bg-red-50',
  },
  disconnected: {
    dot: 'bg-neutral-400',
    badge: 'border-neutral-200 text-neutral-600 bg-neutral-50',
  },
};

/**
 * Connection status indicator for the election-night dashboard.
 *
 * Displays a colored dot and Spanish label:
 *   - Green / Conectado -- Realtime active
 *   - Yellow (pulsing) / Reconectando... -- backoff in progress
 *   - Red / Modo Polling (cada 10s) -- fallback active
 *   - Gray / Desconectado -- no connection
 */
export function ConnectionStatusBadge() {
  const status = useConnectionStore((s) => s.status);
  const reconnectAttempts = useConnectionStore((s) => s.reconnectAttempts);

  const styles = STATUS_STYLES[status];
  let label = CONNECTION_STATUS_LABELS[status];

  if (status === 'reconnecting') {
    label = `${label} (${reconnectAttempts}/3)...`;
  }
  if (status === 'polling') {
    label = `${label} (cada 10s)`;
  }

  return (
    <Badge
      variant="outline"
      className={cn('flex items-center gap-1.5 text-xs font-medium', styles.badge)}
    >
      <span
        className={cn('inline-block h-2 w-2 rounded-full', styles.dot)}
        aria-hidden="true"
      />
      {label}
    </Badge>
  );
}
