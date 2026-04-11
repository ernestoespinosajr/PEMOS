'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/**
 * Dynamically imported ScheduleCalendar component.
 *
 * FullCalendar uses DOM APIs (window, document) and cannot be rendered
 * on the server. Using next/dynamic with ssr: false ensures:
 * - Calendar code is code-split into a separate chunk
 * - Renders only on the client side
 * - Shows a loading skeleton while the chunk loads
 *
 * Per Design-Criteria.md: heavy components dynamically imported with
 * skeleton loading states.
 */

function CalendarSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      {/* Toolbar skeleton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-100" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-100" />
          <div className="h-8 w-12 animate-pulse rounded-md bg-neutral-100" />
        </div>
        <div className="h-6 w-40 animate-pulse rounded bg-neutral-100" />
        <div className="flex gap-1">
          <div className="h-8 w-14 animate-pulse rounded-md bg-neutral-100" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-neutral-100" />
          <div className="h-8 w-10 animate-pulse rounded-md bg-neutral-100" />
          <div className="h-8 w-12 animate-pulse rounded-md bg-neutral-100" />
        </div>
      </div>

      {/* Day headers skeleton */}
      <div className="mb-2 grid grid-cols-7 gap-px">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex justify-center py-2"
          >
            <div className="h-3 w-8 animate-pulse rounded bg-neutral-100" />
          </div>
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="flex h-20 flex-col gap-1 border border-neutral-100 p-1"
          >
            <div className="h-3 w-4 animate-pulse rounded bg-neutral-100" />
            {i % 5 === 0 && (
              <div className="h-2.5 w-full animate-pulse rounded bg-neutral-100" />
            )}
            {i % 7 === 2 && (
              <div className="h-2.5 w-3/4 animate-pulse rounded bg-neutral-100" />
            )}
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="mt-4 flex items-center justify-center">
        <Loader2
          className="h-5 w-5 animate-spin text-primary"
          aria-label="Cargando calendario"
        />
      </div>
    </div>
  );
}

export const DynamicScheduleCalendar = dynamic(
  () =>
    import('./schedule-calendar').then((mod) => ({
      default: mod.ScheduleCalendar,
    })),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  }
);
