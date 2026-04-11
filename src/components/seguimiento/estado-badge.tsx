'use client';

import { Badge } from '@/components/ui/badge';
import { ESTADO_LABELS, ESTADO_COLORS } from '@/types/seguimiento';
import { cn } from '@/lib/utils';

interface EstadoBadgeProps {
  estado: string;
  className?: string;
}

/**
 * Color-coded status badge for seguimiento records.
 * Displays Spanish labels from ESTADO_LABELS.
 */
export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const label = ESTADO_LABELS[estado] ?? estado;
  const colorClass = ESTADO_COLORS[estado] ?? 'bg-neutral-100 text-neutral-600';

  return (
    <Badge
      variant="secondary"
      className={cn('text-xs font-medium', colorClass, className)}
    >
      {label}
    </Badge>
  );
}
