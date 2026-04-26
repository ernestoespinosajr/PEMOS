'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Archive,
  FileText,
  Loader2,
  Menu,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportCatalog } from '@/components/reports/report-catalog';
import { ReportFilterForm } from '@/components/reports/report-filter-form';
import { ReportDataTable } from '@/components/reports/report-data-table';
import { ReportExportBar } from '@/components/reports/report-export-bar';
import { cn } from '@/lib/utils';
import { getReportDefinition } from '@/lib/reports/catalog';
import type {
  ReportDefinition,
  ReportFilters,
  ReportType,
  GenerateReportResponse,
} from '@/types/reports';

// ---------------------------------------------------------------------------
// Report Builder Content
// ---------------------------------------------------------------------------

function ReportBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selected report from URL or state
  const urlReportType = searchParams.get('tipo') as ReportType | null;
  const initialReport = urlReportType
    ? getReportDefinition(urlReportType) ?? null
    : null;

  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(
    initialReport
  );
  const [reportResult, setReportResult] =
    useState<GenerateReportResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  // ---------- Select a report ----------

  const handleSelectReport = useCallback(
    (report: ReportDefinition) => {
      setSelectedReport(report);
      setReportResult(null);
      setError(null);
      setCatalogOpen(false);

      // Update URL param
      const params = new URLSearchParams();
      params.set('tipo', report.type);
      router.push(`/reportes?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  // ---------- Generate report ----------

  const handleGenerate = useCallback(
    async (filters: ReportFilters) => {
      if (!selectedReport) return;

      setGenerating(true);
      setError(null);
      setReportResult(null);

      try {
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_type: selectedReport.type,
            filters,
          }),
        });

        const json = await response.json();

        if (!response.ok) {
          setError(
            json.error ?? 'Error al generar el reporte. Intente de nuevo.'
          );
          return;
        }

        setReportResult(json as GenerateReportResponse);
      } catch (err) {
        console.error('Error generating report:', err);
        setError(
          'Error de conexion al generar el reporte. Verifique su conexion e intente de nuevo.'
        );
      } finally {
        setGenerating(false);
      }
    },
    [selectedReport]
  );

  // ---------- Render ----------

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Reportes
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Generacion y consulta de reportes del sistema
          </p>
        </div>
        <Button variant="outline" asChild className="sm:flex-shrink-0">
          <Link href="/reportes/archivo">
            <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
            Archivo de Reportes
          </Link>
        </Button>
      </div>

      {/* Report Builder Layout */}
      <div className="flex gap-space-6">
        {/* ---- Catalog Sidebar (desktop) ---- */}
        <aside
          className={cn(
            'hidden w-72 flex-shrink-0 rounded-lg border border-border bg-surface py-space-4 shadow-sm lg:block',
            'max-h-[calc(100vh-12rem)] overflow-y-auto sticky top-24'
          )}
          aria-label="Catalogo de reportes"
        >
          <ReportCatalog
            selectedReport={selectedReport?.type ?? null}
            onSelectReport={handleSelectReport}
          />
        </aside>

        {/* ---- Mobile Catalog Toggle ---- */}
        <div className="mb-space-4 lg:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatalogOpen(!catalogOpen)}
            aria-expanded={catalogOpen}
            aria-controls="mobile-report-catalog"
          >
            {catalogOpen ? (
              <X className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {selectedReport
              ? selectedReport.name
              : 'Seleccionar Reporte'}
          </Button>
        </div>

        {/* ---- Mobile Catalog Panel ---- */}
        {catalogOpen && (
          <div
            id="mobile-report-catalog"
            className="fixed inset-0 z-40 lg:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setCatalogOpen(false)}
              aria-hidden="true"
            />
            {/* Panel */}
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] border-r border-border bg-surface py-space-4 shadow-xl">
              <div className="mb-space-4 flex items-center justify-between px-space-4">
                <span className="text-sm font-semibold text-primary-text">
                  Catalogo de Reportes
                </span>
                <button
                  onClick={() => setCatalogOpen(false)}
                  className="rounded-md p-space-1 text-body-text hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label="Cerrar catalogo"
                >
                  <X size={20} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
              <ReportCatalog
                selectedReport={selectedReport?.type ?? null}
                onSelectReport={handleSelectReport}
              />
            </div>
          </div>
        )}

        {/* ---- Main Content Area ---- */}
        <div className="min-w-0 flex-1 space-y-space-6">
          {/* No report selected state */}
          {!selectedReport && (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-border bg-surface shadow-sm">
              <FileText
                size={40}
                strokeWidth={1}
                className="mb-space-3 text-placeholder"
                aria-hidden="true"
              />
              <p className="text-sm text-secondary-text">
                Seleccione un reporte del catalogo para comenzar
              </p>
              <p className="mt-space-1 text-xs text-placeholder">
                Escoja una categoria y el tipo de reporte que desea generar
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-space-4 lg:hidden"
                onClick={() => setCatalogOpen(true)}
              >
                <Menu className="mr-2 h-4 w-4" aria-hidden="true" />
                Ver Catalogo
              </Button>
            </div>
          )}

          {/* Report selected -- show filter form */}
          {selectedReport && (
            <div className="rounded-lg border border-border bg-surface p-space-6 shadow-sm">
              <ReportFilterForm
                report={selectedReport}
                generating={generating}
                onGenerate={handleGenerate}
              />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              className="flex items-start gap-3 rounded-lg border border-error/20 bg-error-light px-4 py-3"
              role="alert"
            >
              <AlertCircle
                size={18}
                strokeWidth={1.5}
                className="mt-0.5 flex-shrink-0 text-error"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-error">
                  Error al generar reporte
                </p>
                <p className="mt-1 text-sm text-body-text">{error}</p>
              </div>
            </div>
          )}

          {/* Export bar (shown when data is available) */}
          {reportResult && reportResult.data.length > 0 && (
            <ReportExportBar reportResult={reportResult} />
          )}

          {/* Data table */}
          {generating ? (
            <ReportDataTable data={[]} loading={true} />
          ) : reportResult ? (
            <ReportDataTable data={reportResult.data} />
          ) : selectedReport ? (
            <ReportDataTable data={[]} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export
// ---------------------------------------------------------------------------

export default function ReportesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-label="Cargando reportes"
          />
        </div>
      }
    >
      <ReportBuilderContent />
    </Suspense>
  );
}
