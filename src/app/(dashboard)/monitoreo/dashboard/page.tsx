'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PeriodoHistorySelector } from '@/components/dashboard/periodo-history-selector';
import { ConnectionStatusBadge } from '@/components/dashboard/connection-status-badge';
import { DashboardFiltersBar } from '@/components/dashboard/dashboard-filters';
import { ElectionLiveDashboard } from '@/components/dashboard/election-live-dashboard';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import type { DashboardFilters } from '@/types/dashboard';
import { DEFAULT_DASHBOARD_FILTERS } from '@/types/dashboard';

/**
 * Election-Night Dashboard page.
 *
 * Real-time dashboard showing vote counts, party breakdowns, candidate
 * comparison, precinct progress, results timeline, and turnout by recinto.
 *
 * Powered by Supabase Realtime with exponential backoff reconnection
 * and polling fallback. Delegates all chart orchestration to the
 * ElectionLiveDashboard container component.
 *
 * Breadcrumb: Dashboard > Monitoreo Electoral
 */
export default function DashboardPage() {
  const [periodoId, setPeriodoId] = useState('');
  const [isActivePeriod, setIsActivePeriod] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(
    DEFAULT_DASHBOARD_FILTERS
  );

  const {
    summary,
    partyVotes,
    timeline,
    turnout,
    candidateVotes,
    precinctProgress,
    isLoading,
    error,
  } = useDashboardData({
    periodoId,
    isActivePeriod,
    filters,
  });

  function handlePeriodoChange(id: string, isActive: boolean) {
    setPeriodoId(id);
    setIsActivePeriod(isActive);
    setFilters(DEFAULT_DASHBOARD_FILTERS);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6">
        <Link
          href="/monitoreo"
          className="mb-space-2 inline-flex items-center gap-1 rounded-sm text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Monitoreo
        </Link>

        <div className="flex flex-col gap-space-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-text">
              Dashboard Electoral
            </h2>
            <p className="mt-space-1 text-sm text-secondary-text">
              {isActivePeriod
                ? 'Resultados en tiempo real de la jornada electoral'
                : 'Vista historica de resultados electorales (solo lectura)'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isActivePeriod && <ConnectionStatusBadge />}
          </div>
        </div>
      </div>

      {/* Historical Period Banner */}
      {!isActivePeriod && periodoId && (
        <div
          className="mb-space-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3"
          role="status"
        >
          <p className="text-sm text-neutral-600">
            Estas viendo un periodo historico. Los datos son de solo lectura y
            las actualizaciones en tiempo real estan desactivadas.
          </p>
        </div>
      )}

      {/* Period Selector + Filters */}
      <div className="mb-space-6 space-y-space-4">
        <PeriodoHistorySelector
          value={periodoId}
          onChange={handlePeriodoChange}
          className="max-w-sm"
        />

        {periodoId && (
          <DashboardFiltersBar filters={filters} onChange={setFilters} />
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-space-4 rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Dashboard Content */}
      {periodoId && (
        <ElectionLiveDashboard
          summary={summary}
          partyVotes={partyVotes}
          timeline={timeline}
          turnout={turnout}
          candidateVotes={candidateVotes}
          precinctProgress={precinctProgress}
          isLoading={isLoading}
          isActivePeriod={isActivePeriod}
        />
      )}
    </div>
  );
}
