'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  CheckCircle,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { MetricCardGrid } from '@/components/dashboard/metric-card-grid';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { DashboardScopeHeader } from '@/components/dashboard/dashboard-scope-header';
import {
  DynamicMemberBarChart,
  DynamicRegistrationLineChart,
  DynamicDistributionPieChart,
} from '@/components/dashboard/charts.dynamic';
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { useMemberChartData } from '@/hooks/use-member-chart-data';
import { useRegistrationChartData } from '@/hooks/use-registration-chart-data';
import { useDistributionChartData } from '@/hooks/use-distribution-chart-data';
import { useUserScope } from '@/hooks/use-user-scope';
import type { PeriodOption } from '@/components/dashboard/period-selector';
import type { DashboardMetric } from '@/hooks/use-dashboard-metrics';

/**
 * Map from metric iconName identifiers to Lucide icon components.
 */
const ICON_MAP: Record<DashboardMetric['iconName'], React.ElementType> = {
  users: Users,
  'bar-chart': BarChart3,
  flag: BarChart3,
  'trending-up': TrendingUp,
  'map-pin': MapPin,
  'check-circle': CheckCircle,
};

/**
 * Metric IDs that are relevant for each role.
 *
 * - Admin and Coordinator: see all metrics (member counts, registration,
 *   coordinators, electoral coverage)
 * - Observer: focused on electoral data -- skip member-management metrics
 *   like "Total de Miembros" and "Coordinadores Activos"
 * - Field Worker: sees member and registration metrics relevant to their
 *   daily work, but not coordinator-level or electoral coverage
 *
 * If a metric ID is not in the allowed list for a role, it is hidden.
 * When role is null (loading/unknown), show all metrics as fallback.
 */
const ROLE_VISIBLE_METRICS: Record<string, string[]> = {
  admin: ['total-members', 'registration-progress', 'active-coordinators', 'electoral-coverage'],
  coordinator: ['total-members', 'registration-progress', 'active-coordinators', 'electoral-coverage'],
  observer: ['registration-progress', 'electoral-coverage'],
  field_worker: ['total-members', 'registration-progress'],
};

/**
 * Main Dashboard page -- the landing view for authenticated users.
 *
 * Structure:
 * 1. Role-scoped header (role badge, title, scope description)
 * 2. PeriodSelector toggle
 * 3. MetricCardGrid with role-filtered metric cards
 * 4. Recharts visualizations (bar, line/area, pie charts -- dynamically imported)
 *
 * Data scoping:
 * All data fetching goes through the Supabase client which includes
 * the user's JWT. RLS policies and RPC security wrapper functions
 * (get_member_counts, get_registration_daily, get_vote_totals_by_candidato)
 * enforce tenant isolation and geographic scope at the database level.
 * No client-side data filtering is needed -- the frontend displays
 * whatever the backend returns, which is already scoped to the user's role.
 */
export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodOption>('1M');
  const { metrics, isLoading, error, refetch } = useDashboardMetrics(period);
  const {
    role,
    roleLabel,
    dashboardTitle,
    dashboardSubtitle,
    isLoading: scopeLoading,
  } = useUserScope();

  // Chart data hooks -- fetching runs in parallel with metrics
  const memberChart = useMemberChartData(period);
  const registrationChart = useRegistrationChartData(period);
  const distributionChart = useDistributionChartData(period);

  // Filter metrics based on role visibility
  const visibleMetrics = useMemo(() => {
    if (!role) return metrics; // Show all while role is loading
    const allowedIds = ROLE_VISIBLE_METRICS[role];
    if (!allowedIds) return metrics; // Fallback: show all for unknown roles
    return metrics.filter((m) => allowedIds.includes(m.id));
  }, [metrics, role]);

  // Expected card count for skeleton fallback (based on role)
  const expectedCardCount = useMemo(() => {
    if (!role) return 4;
    return ROLE_VISIBLE_METRICS[role]?.length ?? 4;
  }, [role]);

  // Show full skeleton on initial load (no metrics yet and still loading)
  if (isLoading && metrics.length === 0 && scopeLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      {/* Role-Scoped Header */}
      <DashboardScopeHeader
        role={role}
        roleLabel={roleLabel}
        title={dashboardTitle}
        subtitle={dashboardSubtitle}
        isLoading={scopeLoading}
      />

      {/* Period Selector */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <PeriodSelector value={period} onChange={setPeriod} />

        {error && (
          <div className="flex items-center gap-space-2">
            <p className="text-xs text-error">{error}</p>
            <button
              onClick={refetch}
              className="rounded-md px-space-2 py-space-1 text-xs font-medium text-primary transition-colors hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* Metric Cards -- filtered by role visibility */}
      <MetricCardGrid>
        {visibleMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            value={metric.value}
            label={metric.label}
            icon={ICON_MAP[metric.iconName] ?? BarChart3}
            trend={metric.trend}
            trendUp={metric.trendUp}
            href={metric.href}
            loading={isLoading}
          />
        ))}

        {/* Fallback: show skeletons for missing cards while loading */}
        {isLoading &&
          visibleMetrics.length < expectedCardCount &&
          Array.from({ length: expectedCardCount - visibleMetrics.length }).map((_, i) => (
            <MetricCard
              key={`skeleton-${i}`}
              value=""
              label=""
              icon={BarChart3}
              loading
            />
          ))}
      </MetricCardGrid>

      {/* Charts Section -- Phase 2: Recharts Visualizations */}
      <div className="mt-space-8 grid grid-cols-1 gap-space-6 lg:grid-cols-2">
        {/* Member Counts by Geographic Level (Bar Chart) */}
        <section
          className="rounded-lg border border-border bg-surface p-space-6 shadow-sm"
          aria-labelledby="chart-members-heading"
        >
          <h3
            id="chart-members-heading"
            className="text-lg font-semibold text-heading"
          >
            Miembros por Nivel Geografico
          </h3>
          <div className="mt-space-4">
            <DynamicMemberBarChart
              data={memberChart.data}
              isLoading={memberChart.isLoading}
            />
          </div>
        </section>

        {/* Registration Progress Over Time (Line/Area Chart) */}
        <section
          className="rounded-lg border border-border bg-surface p-space-6 shadow-sm"
          aria-labelledby="chart-registration-heading"
        >
          <h3
            id="chart-registration-heading"
            className="text-lg font-semibold text-heading"
          >
            Progreso de Registro
          </h3>
          <div className="mt-space-4">
            <DynamicRegistrationLineChart
              data={registrationChart.data}
              isLoading={registrationChart.isLoading}
            />
          </div>
        </section>

        {/* Member Distribution by Role (Pie/Donut Chart) */}
        <section
          className="rounded-lg border border-border bg-surface p-space-6 shadow-sm"
          aria-labelledby="chart-distribution-heading"
        >
          <h3
            id="chart-distribution-heading"
            className="text-lg font-semibold text-heading"
          >
            Distribucion de Miembros
          </h3>
          <div className="mt-space-4">
            <DynamicDistributionPieChart
              data={distributionChart.data}
              isLoading={distributionChart.isLoading}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
