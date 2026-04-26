'use client';

import { cn } from '@/lib/utils';

interface MetricCardGridProps {
  /** Metric card elements to render in the grid. */
  children: React.ReactNode;
  /** Optional additional class names. */
  className?: string;
}

/**
 * Responsive grid container for MetricCard components.
 *
 * Layout breakpoints following Design-Criteria.md:
 * - Mobile (<768px): 1 card per row (stacked)
 * - Tablet (768px-1023px): 2 cards per row
 * - Desktop (1024px+): 4 cards per row
 *
 * Uses space-4 gap (16px) between cards.
 */
export function MetricCardGrid({ children, className }: MetricCardGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-space-4 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
      role="region"
      aria-label="Metricas principales"
    >
      {children}
    </div>
  );
}
