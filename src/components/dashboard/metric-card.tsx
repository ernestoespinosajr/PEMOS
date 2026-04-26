'use client';

import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  /** The large metric value displayed prominently. */
  value: string;
  /** Descriptive label below the value. */
  label: string;
  /** Lucide icon component displayed in the card header. */
  icon: React.ElementType;
  /** Trend percentage string, e.g. "+4.5%" or "-1.2%". */
  trend?: string;
  /** Whether the trend is positive (up) or negative (down). */
  trendUp?: boolean;
  /** Optional href for drill-down navigation when clicking the action icon. */
  href?: string;
  /** Whether the card is in a loading state (shows skeleton). */
  loading?: boolean;
}

/**
 * Summary metric card following the Design-Criteria.md specification:
 * - Surface white background, shadow-sm, rounded-lg (12px)
 * - space-6 internal padding
 * - text-3xl font-bold primary-text metric value
 * - text-sm secondary-text label
 * - Trend indicator with TrendingUp/TrendingDown arrows
 * - Action icon for drill-down navigation
 *
 * Accessibility:
 * - Uses <article> for semantic grouping
 * - Screen reader text announces value, label, and trend direction
 * - Trend indicators use both color AND arrow icons (not color alone)
 * - Action link has descriptive aria-label
 */
export function MetricCard({
  value,
  label,
  icon: Icon,
  trend,
  trendUp = true,
  href,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <article
        className="rounded-lg border border-border bg-surface p-space-6 shadow-sm"
        aria-busy="true"
        aria-label="Cargando metrica"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
          <div className="h-4 w-4 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="mt-space-3 h-9 w-20 animate-pulse rounded bg-neutral-100" />
        <div className="mt-space-2 h-4 w-16 animate-pulse rounded bg-neutral-100" />
      </article>
    );
  }

  const TrendIcon = trendUp ? TrendingUp : TrendingDown;
  const trendColor = trendUp ? 'text-success' : 'text-error';
  const trendLabel = trendUp ? 'incremento' : 'disminucion';

  return (
    <article
      className="rounded-lg border border-border bg-surface p-space-6 shadow-sm transition-shadow duration-hover hover:shadow-md"
      aria-label={`${label}: ${value}`}
    >
      {/* Header: label + icon */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-secondary-text">{label}</p>
        <Icon
          size={16}
          strokeWidth={1.5}
          className="text-placeholder"
          aria-hidden="true"
        />
      </div>

      {/* Metric value */}
      <p className="mt-space-2 text-3xl font-bold tracking-tight text-primary-text">
        {value}
      </p>

      {/* Trend indicator + action */}
      <div className="mt-space-1 flex items-center justify-between">
        {trend ? (
          <div className="flex items-center gap-space-1">
            <TrendIcon
              size={14}
              strokeWidth={1.5}
              className={trendColor}
              aria-hidden="true"
            />
            <span className={cn('text-xs font-medium', trendColor)}>
              {trend}
            </span>
            <span className="sr-only">
              {trendLabel} de {trend}
            </span>
          </div>
        ) : (
          <div />
        )}

        {href && (
          <a
            href={href}
            className="rounded-sm p-space-1 text-placeholder transition-colors duration-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`Ver detalle de ${label}`}
          >
            <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
