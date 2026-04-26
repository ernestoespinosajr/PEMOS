'use client';

import { useState, useCallback } from 'react';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getReportDefinition } from '@/lib/reports/catalog';
import type { ReportArchive } from '@/types/reports';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportArchiveListProps {
  /** Array of archived reports */
  archives: ReportArchive[];
  /** Whether data is loading */
  loading: boolean;
  /** Pagination metadata */
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  } | null;
  /** Whether the current user is an admin (can delete) */
  isAdmin: boolean;
  /** Callback to change page */
  onPageChange: (page: number) => void;
  /** Callback to delete an archive (admin only) */
  onDelete: (id: string) => void;
  /** Whether a delete operation is in progress */
  deleting?: string | null;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ReportArchiveList -- Table of archived/saved reports.
 *
 * Columns: Nombre, Tipo, Fecha, Tamano, Acciones
 *
 * Features:
 * - Download button for each archive entry
 * - Delete button (admin only) with confirmation
 * - Paginated navigation matching the members page pagination pattern
 * - Loading skeleton, empty state
 *
 * Accessibility:
 * - Table with proper headers and scope
 * - Action buttons have descriptive aria-labels
 * - Pagination has nav landmark with aria-label
 * - Loading state announced via aria-busy
 */
export function ReportArchiveList({
  archives,
  loading,
  meta,
  isAdmin,
  onPageChange,
  onDelete,
  deleting = null,
  className,
}: ReportArchiveListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = useCallback(
    (id: string) => {
      if (confirmDeleteId === id) {
        onDelete(id);
        setConfirmDeleteId(null);
      } else {
        setConfirmDeleteId(id);
      }
    },
    [confirmDeleteId, onDelete]
  );

  // ---------- Loading state ----------

  if (loading) {
    return (
      <div
        className={cn('rounded-lg border bg-card shadow-sm', className)}
        aria-busy="true"
        aria-label="Cargando archivo de reportes"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {['Nombre', 'Tipo', 'Fecha', 'Filas', 'Acciones'].map((h) => (
                  <th key={h} className="h-10 px-3 text-left">
                    <div className="h-3 w-16 animate-pulse rounded bg-neutral-100" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row} className="border-b">
                  {[1, 2, 3, 4, 5].map((col) => (
                    <td key={col} className="px-3 py-3">
                      <div className="h-3 w-full animate-pulse rounded bg-neutral-50" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------- Empty state ----------

  if (archives.length === 0) {
    return (
      <div
        className={cn(
          'flex h-64 flex-col items-center justify-center rounded-lg border border-border bg-surface',
          className
        )}
        role="status"
      >
        <Archive
          size={40}
          strokeWidth={1}
          className="mb-space-3 text-placeholder"
          aria-hidden="true"
        />
        <p className="text-sm text-secondary-text">
          No hay reportes archivados
        </p>
        <p className="mt-space-1 text-xs text-placeholder">
          Los reportes guardados apareceran aqui
        </p>
      </div>
    );
  }

  // ---------- Data table ----------

  return (
    <div className={cn('space-y-space-4', className)}>
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Tamano</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archives.map((archive) => {
                const reportDef = getReportDefinition(
                  archive.report_type as Parameters<typeof getReportDefinition>[0]
                );
                const isDeleting = deleting === archive.id;

                return (
                  <TableRow key={archive.id}>
                    {/* Nombre */}
                    <TableCell className="font-medium">
                      {archive.report_name}
                    </TableCell>

                    {/* Tipo */}
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {reportDef?.name ?? archive.report_type}
                      </Badge>
                    </TableCell>

                    {/* Fecha */}
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(archive.generated_at)}
                    </TableCell>

                    {/* Tamano */}
                    <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
                      {formatFileSize(archive.file_size_bytes)}
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Download */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Descargar ${archive.report_name}`}
                          asChild
                        >
                          <a
                            href={archive.file_path}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download size={14} aria-hidden="true" />
                          </a>
                        </Button>

                        {/* Delete (admin only) */}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-8 w-8',
                              confirmDeleteId === archive.id
                                ? 'text-error hover:bg-error-light hover:text-error'
                                : 'text-muted-foreground hover:text-error'
                            )}
                            onClick={() => handleDelete(archive.id)}
                            disabled={isDeleting}
                            aria-label={
                              confirmDeleteId === archive.id
                                ? `Confirmar eliminar ${archive.report_name}`
                                : `Eliminar ${archive.report_name}`
                            }
                          >
                            {isDeleting ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2 size={14} aria-hidden="true" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <nav
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
          aria-label="Paginacion del archivo de reportes"
        >
          <p className="text-sm text-muted-foreground">
            Pagina{' '}
            <span className="font-medium text-primary-text">{meta.page}</span>
            {' de '}
            <span className="font-medium text-primary-text">
              {meta.total_pages}
            </span>
            {' '}
            ({meta.total.toLocaleString('es-DO')} reportes)
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!meta.has_previous}
              onClick={() => onPageChange(meta.page - 1)}
              aria-label="Pagina anterior"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!meta.has_next}
              onClick={() => onPageChange(meta.page + 1)}
              aria-label="Pagina siguiente"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
