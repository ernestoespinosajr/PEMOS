'use client';

import { BarChart3 } from 'lucide-react';

interface ChartEmptyStateProps {
  /** Optional custom message. Defaults to "No hay datos disponibles". */
  message?: string;
}

/**
 * Empty state displayed inside chart containers when there is no data.
 *
 * Design-Criteria.md chart specification:
 * - Centered Lucide BarChart3 icon (48px, placeholder color)
 * - "No hay datos disponibles" text
 */
export function ChartEmptyState({
  message = 'No hay datos disponibles',
}: ChartEmptyStateProps) {
  return (
    <div className="flex h-60 items-center justify-center rounded-md bg-neutral-50">
      <div className="text-center">
        <BarChart3
          size={48}
          strokeWidth={1}
          className="mx-auto text-placeholder"
          aria-hidden="true"
        />
        <p className="mt-space-2 text-sm text-placeholder">{message}</p>
      </div>
    </div>
  );
}
