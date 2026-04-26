'use client';

import { useCallback, useMemo } from 'react';
import { Download, Printer, Clock, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GenerateReportResponse } from '@/types/reports';
import { getReportDefinition } from '@/lib/reports/catalog';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportExportBarProps {
  /** The generated report response containing data and meta */
  reportResult: GenerateReportResponse;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape double quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(data: Record<string, unknown>[]): string {
  const firstRow = data[0];
  if (!firstRow) return '';

  const columns = Object.keys(firstRow);
  const headerRow = columns.map(escapeCSVValue).join(',');

  const dataRows = data.map((row) =>
    columns.map((col) => escapeCSVValue(row[col])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ReportExportBar -- Action bar with export buttons and report metadata.
 *
 * Displayed above the data table after a report is generated.
 *
 * Features:
 * - "Exportar CSV" button: instant client-side CSV download with BOM for Excel
 * - "Imprimir / PDF" button: triggers browser print dialog for PDF generation
 * - Report metadata: row count and generation timestamp
 *
 * Design:
 * - Follows the BulkActionBar pattern from the members page
 * - bg-primary-tint/50 with border for visual grouping
 * - Responsive: buttons wrap on small screens
 *
 * Accessibility:
 * - Buttons have descriptive labels
 * - Metadata announced as part of the document flow
 */
export function ReportExportBar({
  reportResult,
  className,
}: ReportExportBarProps) {
  const { data, meta } = reportResult;
  const reportDef = getReportDefinition(meta.report_type);
  const reportName = reportDef?.name ?? meta.report_type;

  // Format the generation timestamp (memoized to stabilize useCallback deps)
  const generatedAt = useMemo(
    () => new Date(meta.generated_at),
    [meta.generated_at]
  );
  const formattedDate = generatedAt.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = generatedAt.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // CSV export handler
  const handleExportCSV = useCallback(() => {
    const csv = generateCSV(data);
    const safeReportName = reportName.replace(/[^a-zA-Z0-9\s-]/g, '');
    const dateStr = generatedAt.toISOString().slice(0, 10);
    const filename = `${safeReportName}_${dateStr}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  }, [data, reportName, generatedAt]);

  // Print/PDF handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (data.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary-tint/50 px-4 py-3',
        className
      )}
      role="toolbar"
      aria-label="Acciones del reporte"
    >
      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-body-text">
        <span className="inline-flex items-center gap-1.5">
          <Rows3
            size={14}
            strokeWidth={1.5}
            className="text-primary"
            aria-hidden="true"
          />
          <span className="font-medium">{meta.row_count.toLocaleString('es-DO')}</span>{' '}
          fila{meta.row_count !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock
            size={14}
            strokeWidth={1.5}
            className="text-primary"
            aria-hidden="true"
          />
          {formattedDate} {formattedTime}
        </span>
      </div>

      {/* Spacer */}
      <div className="ml-auto flex items-center gap-2">
        {/* CSV Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          aria-label={`Exportar ${reportName} como CSV`}
        >
          <Download size={14} className="mr-1.5" aria-hidden="true" />
          Exportar CSV
        </Button>

        {/* Print / PDF */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          aria-label={`Imprimir ${reportName}`}
        >
          <Printer size={14} className="mr-1.5" aria-hidden="true" />
          Imprimir / PDF
        </Button>
      </div>
    </div>
  );
}
