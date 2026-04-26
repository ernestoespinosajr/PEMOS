'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

export type PeriodOption = '1S' | '1M' | '3M' | '6M' | '1A';

interface PeriodConfig {
  value: PeriodOption;
  label: string;
  fullLabel: string;
}

const PERIOD_OPTIONS: PeriodConfig[] = [
  { value: '1S', label: '1S', fullLabel: '1 semana' },
  { value: '1M', label: '1M', fullLabel: '1 mes' },
  { value: '3M', label: '3M', fullLabel: '3 meses' },
  { value: '6M', label: '6M', fullLabel: '6 meses' },
  { value: '1A', label: '1A', fullLabel: '1 ano' },
];

interface PeriodSelectorProps {
  /** Currently selected period. */
  value: PeriodOption;
  /** Callback when the selected period changes. */
  onChange: (period: PeriodOption) => void;
  /** Optional additional class names. */
  className?: string;
}

/**
 * Toggle button group for selecting time periods on the dashboard.
 *
 * Design-Criteria.md chart spec:
 * - text-xs toggle buttons, rounded-md
 * - Active button: primary-tint background + primary text
 * - Inactive button: transparent background, secondary-text
 *
 * Accessibility:
 * - Uses role="group" with aria-label
 * - Each button has aria-pressed for toggle state
 * - Arrow key navigation between options (roving tabindex)
 * - Full labels announced via aria-label on each button
 */
export function PeriodSelector({
  value,
  onChange,
  className,
}: PeriodSelectorProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = PERIOD_OPTIONS.findIndex((o) => o.value === value);
      let nextIndex = currentIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % PERIOD_OPTIONS.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex =
          (currentIndex - 1 + PERIOD_OPTIONS.length) % PERIOD_OPTIONS.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = PERIOD_OPTIONS.length - 1;
      } else {
        return;
      }

      const nextOption = PERIOD_OPTIONS[nextIndex]!;
      onChange(nextOption.value);

      // Move focus to the newly selected button
      const buttons = groupRef.current?.querySelectorAll('button');
      buttons?.[nextIndex]?.focus();
    },
    [value, onChange]
  );

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label="Selector de periodo"
      className={cn(
        'inline-flex items-center gap-space-1 rounded-md border border-border bg-neutral-50 p-space-1',
        className
      )}
    >
      {PERIOD_OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.fullLabel}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'rounded-md px-space-3 py-space-1 text-xs font-medium transition-colors duration-hover',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
              isActive
                ? 'bg-primary-tint text-primary shadow-sm'
                : 'text-secondary-text hover:text-primary-text'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { PERIOD_OPTIONS };
