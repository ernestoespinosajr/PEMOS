'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
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
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROWS_PER_PAGE = 50;

// ---------------------------------------------------------------------------
// Column header display names (Spanish labels for common DB column names)
// ---------------------------------------------------------------------------

const COLUMN_LABELS: Record<string, string> = {
  // Common identifiers
  id: 'ID',
  cedula: 'Cedula',
  nombre: 'Nombre',
  apellido: 'Apellido',
  apodo: 'Apodo',
  email: 'Email',
  telefono: 'Telefono',
  celular: 'Celular',
  telefono_residencia: 'Telefono Residencia',
  direccion: 'Direccion',
  direccion_actual: 'Direccion Actual',
  ocupacion: 'Ocupacion',
  trabajo: 'Trabajo',
  sexo: 'Sexo',
  fecha_nacimiento: 'Fecha Nacimiento',
  foto_url: 'Foto',
  created_at: 'Fecha Registro',

  // Member fields
  tipo_miembro: 'Tipo Miembro',
  miembro_tipo: 'Tipo Miembro',
  miembro_id: 'ID Miembro',
  miembro_cedula: 'Cedula Miembro',
  miembro_nombre: 'Nombre Miembro',
  miembro_apellido: 'Apellido Miembro',
  miembro_telefono: 'Telefono Miembro',
  miembro_celular: 'Celular Miembro',
  miembro_sector: 'Sector Miembro',
  miembro_colegio: 'Colegio Miembro',
  miembro_estado: 'Estado Miembro',
  vinculado: 'Vinculado',
  votacion: 'Votacion',

  // Coordinator fields
  coordinador_id: 'ID Coordinador',
  coordinador_cedula: 'Cedula Coordinador',
  coordinador_nombre: 'Nombre Coordinador',
  coordinador_apellido: 'Apellido Coordinador',
  coordinador_telefono: 'Telefono Coordinador',

  // Geographic fields
  sector_id: 'ID Sector',
  sector_nombre: 'Sector',
  sector_codigo: 'Codigo Sector',
  circunscripcion_nombre: 'Circunscripcion',
  municipio_nombre: 'Municipio',
  provincia_nombre: 'Provincia',
  comite_nombre: 'Comite',
  nivel_intermedio_nombre: 'Nivel Intermedio',
  nivel_intermedio_id: 'ID Nivel Intermedio',
  nivel_intermedio_codigo: 'Codigo Nivel Intermedio',
  geo_id: 'ID Geografico',
  geo_nombre: 'Nombre Geografico',

  // Recinto fields
  recinto_id: 'ID Recinto',
  recinto_nombre: 'Recinto',
  recinto_codigo: 'Codigo Recinto',
  recinto_municipio: 'Municipio Recinto',
  colegio: 'Colegio',
  colegio_ubicacion: 'Ubicacion Colegio',

  // Electoral fields
  partido_id: 'ID Partido',
  partido_nombre: 'Partido',
  partido_siglas: 'Siglas',
  partido_color: 'Color Partido',
  total_votos: 'Total Votos',
  recintos_reportados: 'Recintos Reportados',
  porcentaje: 'Porcentaje',
  porcentaje_of_alliance: '% de Alianza',
  candidatos_reportados: 'Candidatos Reportados',
  colegios_reportados: 'Colegios Reportados',
  total_colegios: 'Total Colegios',
  actas_registradas: 'Actas Registradas',
  actas_faltantes: 'Actas Faltantes',
  estado_completitud: 'Estado',
  ultima_acta_at: 'Ultima Acta',

  // Turnout fields
  total_miembros: 'Total Miembros',
  votaron: 'Votaron',
  no_votaron: 'No Votaron',
  tasa_participacion: 'Tasa Participacion',

  // Summary fields
  coordinadores: 'Coordinadores',
  multiplicadores: 'Multiplicadores',
  relacionados: 'Relacionados',
  total_multiplicadores: 'Total Multiplicadores',
  total_relacionados: 'Total Relacionados',
  total_subordinados: 'Total Subordinados',
  total_in_nivel: 'Total en Nivel',

  // Registration fields
  registration_date: 'Fecha',
  total_registrations: 'Total Registros',
  cumulative_total: 'Acumulado',

  // Activity fields
  usuario_id: 'ID Usuario',
  usuario_nombre: 'Usuario',
  fecha: 'Fecha',
  total_contactos: 'Total Contactos',
  contactados_si: 'Contactados (Si)',
  contactados_no: 'Contactados (No)',
  registrados: 'Registrados',
  rechazados: 'Rechazados',
  pendientes: 'Pendientes',
};

function getColumnLabel(key: string): string {
  if (COLUMN_LABELS[key]) return COLUMN_LABELS[key];
  // Convert snake_case to Title Case as fallback
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportDataTableProps {
  /** The report data rows */
  data: Record<string, unknown>[];
  /** Whether data is currently loading */
  loading?: boolean;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: string;
  direction: SortDirection;
}

function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  const aVal = a ?? '';
  const bVal = b ?? '';

  let comparison = 0;

  if (typeof aVal === 'number' && typeof bVal === 'number') {
    comparison = aVal - bVal;
  } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
    comparison = aVal === bVal ? 0 : aVal ? 1 : -1;
  } else {
    comparison = String(aVal).localeCompare(String(bVal), 'es', {
      numeric: true,
      sensitivity: 'base',
    });
  }

  return direction === 'desc' ? -comparison : comparison;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatCellValue(value: unknown, columnKey: string): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (typeof value === 'number') {
    // Percentage fields
    if (
      columnKey.includes('porcentaje') ||
      columnKey.includes('tasa_')
    ) {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString('es-DO');
  }
  // ISO date strings
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(value)
  ) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // If it has a time component, show date + time
        if (value.includes('T')) {
          return date.toLocaleDateString('es-DO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        return date.toLocaleDateString('es-DO', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      // Fall through to string
    }
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ReportDataTable -- Displays generated report data in a sortable, paginated table.
 *
 * Design patterns:
 * - Uses existing Table, TableHeader, TableBody, TableRow, TableHead, TableCell from ui/table
 * - Rounded-lg border bg-card shadow-sm wrapper (same as RecintoTable)
 * - Client-side sorting via clickable column headers
 * - Client-side pagination with 50 rows per page
 * - Empty state with centered icon and message
 * - Horizontal scroll on overflow for wide tables
 *
 * Accessibility:
 * - Sort buttons have aria-sort attributes
 * - Pagination has aria-label and page indicators
 * - Empty state announced via role="status"
 * - Loading state shows skeleton rows
 */
export function ReportDataTable({
  data,
  loading = false,
  className,
}: ReportDataTableProps) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

  // Reset page when data changes
  useEffect(() => {
    setPage(1);
  }, [data]);

  // Derive columns from the first row
  const columns = useMemo(() => {
    const firstRow = data[0];
    if (!firstRow) return [];
    return Object.keys(firstRow).filter(
      (key) => key !== 'total_count' // Strip internal fields
    );
  }, [data]);

  // Sort data client-side
  const sortedData = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) =>
      compareValues(a[sort.column], b[sort.column], sort.direction)
    );
  }, [data, sort]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
  const currentPage = Math.min(page, totalPages || 1);
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const pageData = sortedData.slice(startIdx, startIdx + ROWS_PER_PAGE);

  function handleSort(column: string) {
    setSort((prev) => {
      if (prev?.column === column) {
        // Toggle direction, then clear on third click
        if (prev.direction === 'asc') return { column, direction: 'desc' };
        return null;
      }
      return { column, direction: 'asc' };
    });
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }

  // ---------- Loading state ----------

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-card shadow-sm',
          className
        )}
        aria-busy="true"
        aria-label="Cargando datos del reporte"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {[1, 2, 3, 4, 5].map((i) => (
                  <th key={i} className="h-10 px-3">
                    <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
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

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex h-64 flex-col items-center justify-center rounded-lg border border-border bg-surface',
          className
        )}
        role="status"
      >
        <FileSpreadsheet
          size={40}
          strokeWidth={1}
          className="mb-space-3 text-placeholder"
          aria-hidden="true"
        />
        <p className="text-sm text-secondary-text">
          Seleccione un reporte y configure los filtros
        </p>
        <p className="mt-space-1 text-xs text-placeholder">
          Los datos apareceran aqui despues de generar el reporte
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
                {columns.map((col) => {
                  const isSorted = sort?.column === col;
                  const sortDir = isSorted ? sort!.direction : undefined;

                  return (
                    <TableHead
                      key={col}
                      className="whitespace-nowrap"
                      aria-sort={
                        isSorted
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground transition-colors hover:text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        aria-label={`Ordenar por ${getColumnLabel(col)}`}
                      >
                        {getColumnLabel(col)}
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp
                              size={14}
                              strokeWidth={1.5}
                              className="text-primary"
                              aria-hidden="true"
                            />
                          ) : (
                            <ArrowDown
                              size={14}
                              strokeWidth={1.5}
                              className="text-primary"
                              aria-hidden="true"
                            />
                          )
                        ) : (
                          <ArrowUpDown
                            size={14}
                            strokeWidth={1.5}
                            className="text-placeholder"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((row, idx) => (
                <TableRow key={startIdx + idx}>
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      className={cn(
                        'whitespace-nowrap',
                        col.includes('cedula') && 'font-mono text-sm'
                      )}
                    >
                      {formatCellValue(row[col], col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
          aria-label="Paginacion de resultados del reporte"
        >
          <p className="text-sm text-muted-foreground">
            Mostrando{' '}
            <span className="font-medium text-primary-text">
              {startIdx + 1}
            </span>
            {' - '}
            <span className="font-medium text-primary-text">
              {Math.min(startIdx + ROWS_PER_PAGE, sortedData.length)}
            </span>
            {' de '}
            <span className="font-medium text-primary-text">
              {sortedData.length.toLocaleString('es-DO')}
            </span>{' '}
            filas
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Pagina anterior"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>

            <span className="px-3 text-sm text-muted-foreground">
              Pagina{' '}
              <span className="font-medium text-primary-text">
                {currentPage}
              </span>{' '}
              de {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
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
