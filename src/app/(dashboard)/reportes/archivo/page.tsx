'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectNative } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { ReportArchiveList } from '@/components/reports/report-archive-list';
import { REPORT_CATALOG } from '@/lib/reports/catalog';
import { useUserScope } from '@/hooks/use-user-scope';
import type { ReportArchive } from '@/types/reports';

// ---------------------------------------------------------------------------
// Meta type matching the API response
// ---------------------------------------------------------------------------

interface ArchiveMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ---------------------------------------------------------------------------
// Archive Content
// ---------------------------------------------------------------------------

function ArchivoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-driven state
  const pageParam = parseInt(searchParams.get('page') ?? '1', 10) || 1;
  const reportTypeFilter = searchParams.get('tipo') ?? '';

  // Data state
  const [archives, setArchives] = useState<ReportArchive[]>([]);
  const [meta, setMeta] = useState<ArchiveMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Derive admin status from the authenticated user's role
  const { role } = useUserScope();
  const isAdmin = role === 'admin';

  // ---------- Fetch archives ----------

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('page_size', '25');
      if (reportTypeFilter) {
        params.set('report_type', reportTypeFilter);
      }

      const response = await fetch(
        `/api/reports/archives?${params.toString()}`
      );
      const json = await response.json();

      if (!response.ok) {
        setError(
          json.error ?? 'Error al cargar el archivo de reportes'
        );
        setArchives([]);
        setMeta(null);
        return;
      }

      setArchives(json.data ?? []);
      setMeta(json.meta ?? null);
    } catch (err) {
      console.error('Error fetching archives:', err);
      setError(
        'Error de conexion al cargar reportes archivados. Verifique su conexion e intente de nuevo.'
      );
      setArchives([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [pageParam, reportTypeFilter]);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  // ---------- URL navigation ----------

  function pushParams(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (reportTypeFilter) params.set('tipo', reportTypeFilter);
    params.set('page', String(pageParam));

    // Apply overrides
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    router.push(`/reportes/archivo?${params.toString()}`, { scroll: false });
  }

  function handlePageChange(page: number) {
    pushParams({ page: String(page) });
  }

  function handleFilterChange(tipo: string) {
    pushParams({ tipo, page: '1' });
  }

  // ---------- Delete handler ----------

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id);
      try {
        const response = await fetch(
          `/api/reports/archives?id=${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          const json = await response.json();
          setError(json.error ?? 'Error al eliminar el reporte');
          return;
        }

        // Refresh list
        fetchArchives();
      } catch (err) {
        console.error('Error deleting archive:', err);
        setError('Error de conexion al eliminar el reporte');
      } finally {
        setDeleting(null);
      }
    },
    [fetchArchives]
  );

  // ---------- Render ----------

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-space-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 flex-shrink-0"
          >
            <Link href="/reportes" aria-label="Volver a Reportes">
              <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-text">
              Archivo de Reportes
            </h2>
            <p className="mt-space-1 text-sm text-secondary-text">
              Reportes generados y guardados previamente
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-space-4">
        <div className="max-w-xs space-y-1.5">
          <Label
            htmlFor="archive-tipo-filter"
            className="text-xs text-muted-foreground"
          >
            Filtrar por tipo de reporte
          </Label>
          <SelectNative
            id="archive-tipo-filter"
            value={reportTypeFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {REPORT_CATALOG.map((r) => (
              <option key={r.type} value={r.type}>
                {r.name}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="mb-space-4 flex items-start gap-3 rounded-lg border border-error/20 bg-error-light px-4 py-3"
          role="alert"
        >
          <AlertCircle
            size={18}
            strokeWidth={1.5}
            className="mt-0.5 flex-shrink-0 text-error"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-error">Error</p>
            <p className="mt-1 text-sm text-body-text">{error}</p>
          </div>
        </div>
      )}

      {/* Archive list */}
      <ReportArchiveList
        archives={archives}
        loading={loading}
        meta={meta}
        isAdmin={isAdmin}
        onPageChange={handlePageChange}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export
// ---------------------------------------------------------------------------

export default function ReportesArchivoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-label="Cargando archivo de reportes"
          />
        </div>
      }
    >
      <ArchivoContent />
    </Suspense>
  );
}
