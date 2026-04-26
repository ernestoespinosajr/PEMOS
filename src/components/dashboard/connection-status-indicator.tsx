'use client';

import { useConnectionStatus } from '@/hooks/use-connection-status';
import { cn } from '@/lib/utils';
import type { ConnectionStatus } from '@/types/dashboard';

/**
 * Style configuration for each connection status.
 */
const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    dotColor: string;
    animate: boolean;
    textColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  connected: {
    dotColor: 'bg-emerald-500',
    animate: true,
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  disconnected: {
    dotColor: 'bg-red-500',
    animate: false,
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  reconnecting: {
    dotColor: 'bg-amber-500',
    animate: true,
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  polling: {
    dotColor: 'bg-orange-500',
    animate: false,
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
};

/**
 * Fixed-position connection status indicator for the election-night dashboard.
 *
 * Positioned at the bottom-left corner of the viewport (z-50).
 * Shows a colored dot with status text in Spanish:
 *   - Green pulsing: "En vivo" (Realtime active)
 *   - Red: "Desconectado" (no connection)
 *   - Yellow pulsing: "Reconectando..." (backoff in progress)
 *   - Orange: "Actualizacion periodica" (polling fallback)
 *
 * Accessible: uses role="status" with aria-live for screen reader announcements.
 */
export function ConnectionStatusIndicator() {
  const { status, label, lastEventAt } = useConnectionStatus();
  const config = STATUS_CONFIG[status];

  const timeAgo = lastEventAt
    ? formatTimeAgo(lastEventAt)
    : null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-md transition-colors',
        config.bgColor,
        config.borderColor
      )}
      role="status"
      aria-live="polite"
      aria-label={`Estado de conexion: ${label}`}
    >
      {/* Status dot */}
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        {config.animate && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.dotColor
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-2.5 w-2.5 rounded-full',
            config.dotColor
          )}
        />
      </span>

      {/* Status text */}
      <span className={cn('text-xs font-medium', config.textColor)}>
        {label}
      </span>

      {/* Last event time (only when connected) */}
      {timeAgo && status === 'connected' && (
        <span className="text-xs text-emerald-500" aria-label={`Ultimo evento: ${timeAgo}`}>
          {timeAgo}
        </span>
      )}
    </div>
  );
}

/**
 * Formats a Date as a relative time string in Spanish.
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return 'ahora';
  if (seconds < 60) return `hace ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;

  return `hace ${Math.floor(minutes / 60)}h`;
}
