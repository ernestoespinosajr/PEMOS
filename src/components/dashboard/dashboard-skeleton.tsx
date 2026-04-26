'use client';

import { cn } from '@/lib/utils';

/**
 * Skeleton loading state for the main dashboard page.
 *
 * Matches the final layout structure to prevent CLS:
 * - Page title skeleton
 * - Period selector skeleton
 * - 4 metric card skeletons in the responsive grid
 * - 2 chart placeholder skeletons
 *
 * All skeleton elements use animate-pulse with neutral-100 background
 * to match the project's existing skeleton patterns.
 */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando dashboard">
      {/* Page Title Skeleton */}
      <div className="mb-space-8">
        <div className="h-8 w-40 animate-pulse rounded bg-neutral-100" />
        <div className="mt-space-2 h-4 w-72 animate-pulse rounded bg-neutral-100" />
      </div>

      {/* Period Selector Skeleton */}
      <div className="mb-space-6">
        <div className="inline-flex gap-space-1 rounded-md border border-border bg-neutral-50 p-space-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-6 w-10 animate-pulse rounded-md bg-neutral-100"
            />
          ))}
        </div>
      </div>

      {/* Metric Card Grid Skeleton */}
      <div className="grid grid-cols-1 gap-space-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart Placeholders Skeleton */}
      <div className="mt-space-8 grid grid-cols-1 gap-space-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}

/**
 * Skeleton for a single metric card.
 * Matches MetricCard dimensions: rounded-lg, border, p-space-6.
 */
function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-space-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-4 animate-pulse rounded bg-neutral-100" />
      </div>
      <div className="mt-space-3 h-9 w-20 animate-pulse rounded bg-neutral-100" />
      <div className="mt-space-2 h-4 w-16 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}

interface ChartSkeletonProps {
  className?: string;
}

/**
 * Skeleton for a chart card placeholder.
 * Matches the standard chart card: rounded-lg, border, p-space-6, with a 192px-tall gray area.
 */
export function ChartSkeleton({ className }: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-space-6 shadow-sm',
        className
      )}
    >
      <div className="mb-space-4 h-5 w-36 animate-pulse rounded bg-neutral-100" />
      <div className="h-48 animate-pulse rounded-md bg-neutral-50" />
    </div>
  );
}
