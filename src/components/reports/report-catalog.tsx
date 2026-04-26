'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Users,
  Vote,
  MapPin,
  CalendarDays,
  Activity,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  REPORT_CATALOG,
  REPORT_CATEGORIES,
  type CategoryInfo,
} from '@/lib/reports/catalog';
import type { ReportType, ReportDefinition } from '@/types/reports';

// ---------------------------------------------------------------------------
// Icon map -- maps the string icon name from the catalog to the Lucide component
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Vote,
  MapPin,
  CalendarDays,
  Activity,
};

function getCategoryIcon(info: CategoryInfo): React.ElementType {
  return ICON_MAP[info.icon] ?? FileText;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportCatalogProps {
  /** Currently selected report type */
  selectedReport: ReportType | null;
  /** Callback when a report is selected */
  onSelectReport: (report: ReportDefinition) => void;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ReportCatalog -- Sidebar listing all report types grouped by category.
 *
 * Follows existing sidebar patterns from the app:
 * - Collapsible category sections with chevron indicators
 * - Active report highlighted with primary-tint background and left accent bar
 * - Keyboard accessible: Enter/Space to toggle sections and select reports
 * - Screen reader announcements for expanded/collapsed states
 *
 * Design tokens:
 * - Surface white background, border-border right border
 * - text-sm for items, text-xs uppercase for section labels
 * - space-2/space-3/space-4 for padding following the spacing system
 */
export function ReportCatalog({
  selectedReport,
  onSelectReport,
  className,
}: ReportCatalogProps) {
  // All categories start expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(REPORT_CATEGORIES.map((c) => c.key))
  );

  function toggleCategory(key: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <nav
      className={cn('flex flex-col', className)}
      aria-label="Catalogo de reportes"
    >
      <div className="mb-space-4 px-space-4">
        <h3 className="text-sm font-semibold text-primary-text">
          Catalogo de Reportes
        </h3>
        <p className="mt-space-1 text-xs text-secondary-text">
          {REPORT_CATALOG.length} reportes disponibles
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {REPORT_CATEGORIES.map((category) => {
          const Icon = getCategoryIcon(category);
          const reports = REPORT_CATALOG.filter(
            (r) => r.category === category.key
          );
          const isExpanded = expandedCategories.has(category.key);
          const hasActiveReport = reports.some(
            (r) => r.type === selectedReport
          );

          return (
            <div key={category.key} className="mb-space-1">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.key)}
                className={cn(
                  'flex w-full items-center gap-space-2 px-space-4 py-space-3 text-left transition-colors duration-150',
                  'hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
                  hasActiveReport && !isExpanded
                    ? 'bg-primary-50'
                    : ''
                )}
                aria-expanded={isExpanded}
                aria-controls={`report-category-${category.key}`}
              >
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className="flex-shrink-0 text-placeholder"
                  aria-hidden="true"
                />
                <span className="flex-1 text-xs font-medium uppercase tracking-wide text-secondary-text">
                  {category.label}
                </span>
                <span className="mr-space-1 text-xs text-placeholder">
                  {reports.length}
                </span>
                {isExpanded ? (
                  <ChevronDown
                    size={14}
                    strokeWidth={1.5}
                    className="flex-shrink-0 text-placeholder"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    strokeWidth={1.5}
                    className="flex-shrink-0 text-placeholder"
                    aria-hidden="true"
                  />
                )}
              </button>

              {/* Category Reports */}
              {isExpanded && (
                <ul
                  id={`report-category-${category.key}`}
                  role="list"
                  className="pb-space-2"
                >
                  {reports.map((report) => {
                    const isActive = report.type === selectedReport;
                    return (
                      <li key={report.type}>
                        <button
                          type="button"
                          onClick={() => onSelectReport(report)}
                          className={cn(
                            'relative flex w-full items-start gap-space-2 px-space-4 py-space-2 pl-space-8 text-left transition-colors duration-150',
                            'hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
                            isActive
                              ? 'bg-primary-tint font-medium text-primary'
                              : 'text-body-text'
                          )}
                          aria-current={isActive ? 'true' : undefined}
                        >
                          {/* Active indicator */}
                          {isActive && (
                            <span
                              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {report.name}
                            </span>
                            <span
                              className={cn(
                                'mt-0.5 block truncate text-xs',
                                isActive
                                  ? 'text-primary/70'
                                  : 'text-secondary-text'
                              )}
                            >
                              {report.description}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Skeleton for loading state
// ---------------------------------------------------------------------------

export function ReportCatalogSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Cargando catalogo de reportes">
      <div className="mb-space-4 px-space-4">
        <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
        <div className="mt-space-2 h-3 w-24 animate-pulse rounded bg-neutral-100" />
      </div>

      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="mb-space-2 px-space-4">
          <div className="mb-space-2 h-8 w-full animate-pulse rounded bg-neutral-100" />
          {[1, 2, 3].map((j) => (
            <div
              key={j}
              className="mb-space-1 ml-space-4 h-10 animate-pulse rounded bg-neutral-50"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
