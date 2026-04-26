'use client';

import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HierarchyBreadcrumbItem } from '@/types/hierarchy';
import { LEVEL_LABELS } from '@/types/hierarchy';

interface HierarchyBreadcrumbProps {
  /** Ordered list of ancestors from root to current level parent. */
  items: HierarchyBreadcrumbItem[];
  /** The current level being viewed (e.g. 'municipio'). */
  currentLevelLabel: string;
  /** Fired when user clicks a breadcrumb segment to navigate up. */
  onNavigate: (level: HierarchyBreadcrumbItem | null) => void;
  className?: string;
}

/**
 * Breadcrumb navigation for the hierarchy drill-down.
 *
 * Renders:  Home (Provincias) > [Selected Provincia] > Municipios > ...
 *
 * Clicking any segment navigates back up the hierarchy.
 * Uses a proper <nav> with aria-label for accessibility.
 */
export function HierarchyBreadcrumb({
  items,
  currentLevelLabel,
  onNavigate,
  className,
}: HierarchyBreadcrumbProps) {
  return (
    <nav
      aria-label="Navegacion de jerarquia"
      className={cn('mb-space-4', className)}
    >
      <ol className="flex flex-wrap items-center gap-space-1 text-sm">
        {/* Root: Provincias */}
        <li className="flex items-center gap-space-1">
          <button
            type="button"
            onClick={() => onNavigate(null)}
            className="inline-flex items-center gap-1 text-secondary-text transition-colors duration-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <Home
              size={14}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>{LEVEL_LABELS.provincia.plural}</span>
          </button>
        </li>

        {/* Ancestor segments */}
        {items.map((item) => (
          <li
            key={`${item.level}-${item.id}`}
            className="flex items-center gap-space-1"
          >
            <ChevronRight
              size={14}
              strokeWidth={1.5}
              className="text-placeholder"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => onNavigate(item)}
              className="text-secondary-text transition-colors duration-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              {item.label}
            </button>
          </li>
        ))}

        {/* Current level label (not clickable) */}
        {items.length > 0 && (
          <li className="flex items-center gap-space-1">
            <ChevronRight
              size={14}
              strokeWidth={1.5}
              className="text-placeholder"
              aria-hidden="true"
            />
            <span
              className="font-medium text-primary-text"
              aria-current="page"
            >
              {currentLevelLabel}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
