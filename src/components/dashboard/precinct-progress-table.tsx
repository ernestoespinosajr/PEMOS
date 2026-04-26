'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PrecinctProgress } from '@/types/dashboard';

interface PrecinctProgressTableProps {
  /** Precinct progress data from the precinct-progress API endpoint. */
  data: PrecinctProgress[];
  /** Whether data is currently loading. */
  loading?: boolean;
}

type SortField = 'recinto_nombre' | 'porcentaje' | 'last_update';
type SortDirection = 'asc' | 'desc';

/**
 * Returns Tailwind color classes for progress bar based on completion percentage.
 *   - 100%: emerald (complete)
 *   - 1-99%: amber (partial)
 *   - 0%: neutral (pending)
 */
function getProgressColor(porcentaje: number): {
  bar: string;
  text: string;
  badge: string;
} {
  if (porcentaje >= 100) {
    return {
      bar: 'bg-emerald-500',
      text: 'text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (porcentaje > 0) {
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-700',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  return {
    bar: 'bg-neutral-300',
    text: 'text-neutral-500',
    badge: 'bg-neutral-50 text-neutral-500 border-neutral-200',
  };
}

/**
 * Returns a status label in Spanish based on completion percentage.
 */
function getStatusLabel(porcentaje: number): string {
  if (porcentaje >= 100) return 'Completo';
  if (porcentaje > 0) return 'Parcial';
  return 'Pendiente';
}

/**
 * Formats an ISO timestamp as a relative time string in Spanish.
 */
function formatLastUpdate(iso: string | null): string {
  if (!iso) return '--';

  try {
    const date = new Date(iso);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'hace un momento';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`;
    return date.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '--';
  }
}

/**
 * Table showing acta processing status by recinto (precinct).
 *
 * Columns: Recinto name, Colegios reported/total, % complete, last update time.
 * Sortable by clicking column headers (recinto name, percentage, last update).
 * Color-coded progress bars: green for complete, amber for partial, gray for pending.
 *
 * Accessibility:
 *   - Table uses semantic `<table>` elements
 *   - Sort buttons have aria-sort attributes
 *   - Progress bars have aria-valuenow/aria-valuemin/aria-valuemax
 *   - Screen reader text for status labels
 */
export function PrecinctProgressTable({
  data,
  loading,
}: PrecinctProgressTableProps) {
  const [sortField, setSortField] = useState<SortField>('porcentaje');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    if (data.length === 0) return [];

    return [...data].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'recinto_nombre':
          return direction * a.recinto_nombre.localeCompare(b.recinto_nombre, 'es');
        case 'porcentaje':
          return direction * (a.porcentaje - b.porcentaje);
        case 'last_update': {
          const aTime = a.last_update ? new Date(a.last_update).getTime() : 0;
          const bTime = b.last_update ? new Date(b.last_update).getTime() : 0;
          return direction * (aTime - bTime);
        }
        default:
          return 0;
      }
    });
  }, [data, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'recinto_nombre' ? 'asc' : 'desc');
    }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className="inline" aria-hidden="true" />
    ) : (
      <ChevronDown size={14} className="inline" aria-hidden="true" />
    );
  }

  function getAriaSortValue(
    field: SortField
  ): 'ascending' | 'descending' | 'none' {
    if (sortField !== field) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  // Loading skeleton
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-primary-text">
            Progreso por Recinto
          </p>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded bg-neutral-100"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex h-40 items-center justify-center p-4">
          <div className="text-center">
            <Clock
              size={32}
              strokeWidth={1}
              className="mx-auto text-placeholder"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm text-placeholder">
              No hay datos de progreso disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Summary stats
  const totalRecintos = data.length;
  const completados = data.filter((r) => r.porcentaje >= 100).length;
  const parciales = data.filter(
    (r) => r.porcentaje > 0 && r.porcentaje < 100
  ).length;
  const pendientes = data.filter((r) => r.porcentaje === 0).length;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-primary-text">
            Progreso por Recinto
          </p>
          <div className="flex items-center gap-3 text-xs text-secondary-text">
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              {completados} completos
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              {parciales} parciales
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full bg-neutral-300"
                aria-hidden="true"
              />
              {pendientes} pendientes
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer text-xs select-none"
                  aria-sort={getAriaSortValue('recinto_nombre')}
                  onClick={() => handleSort('recinto_nombre')}
                >
                  <span className="inline-flex items-center gap-1">
                    Recinto {getSortIcon('recinto_nombre')}
                  </span>
                </TableHead>
                <TableHead className="text-right text-xs">
                  Colegios
                </TableHead>
                <TableHead
                  className="w-40 cursor-pointer text-xs select-none"
                  aria-sort={getAriaSortValue('porcentaje')}
                  onClick={() => handleSort('porcentaje')}
                >
                  <span className="inline-flex items-center gap-1">
                    Progreso {getSortIcon('porcentaje')}
                  </span>
                </TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead
                  className="cursor-pointer text-right text-xs select-none"
                  aria-sort={getAriaSortValue('last_update')}
                  onClick={() => handleSort('last_update')}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    Ultima Actualizacion {getSortIcon('last_update')}
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row) => {
                const colors = getProgressColor(row.porcentaje);
                return (
                  <TableRow key={row.recinto_id}>
                    {/* Recinto name */}
                    <TableCell className="text-sm font-medium text-primary-text">
                      {row.recinto_nombre}
                    </TableCell>

                    {/* Colegios reported/total */}
                    <TableCell className="text-right text-sm tabular-nums text-secondary-text">
                      {row.colegios_reportados}/{row.total_colegios}
                    </TableCell>

                    {/* Progress bar */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-full rounded-full bg-neutral-100"
                          role="progressbar"
                          aria-valuenow={row.porcentaje}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${row.recinto_nombre}: ${row.porcentaje}% completado`}
                        >
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all duration-300',
                              colors.bar
                            )}
                            style={{
                              width: `${Math.min(row.porcentaje, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            'flex-shrink-0 text-xs font-medium tabular-nums',
                            colors.text
                          )}
                        >
                          {row.porcentaje}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                          colors.badge
                        )}
                      >
                        {getStatusLabel(row.porcentaje)}
                      </span>
                    </TableCell>

                    {/* Last update */}
                    <TableCell className="text-right text-xs text-secondary-text">
                      {formatLastUpdate(row.last_update)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer summary */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-placeholder">
            {totalRecintos} recintos en total
          </p>
          <p className="text-xs font-medium tabular-nums text-secondary-text">
            {completados}/{totalRecintos} completados (
            {totalRecintos > 0
              ? Math.round((completados / totalRecintos) * 100)
              : 0}
            %)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
