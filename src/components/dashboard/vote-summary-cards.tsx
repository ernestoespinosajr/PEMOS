'use client';

import { Vote, MapPin, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardSummary } from '@/types/dashboard';

interface VoteSummaryCardsProps {
  summary: DashboardSummary | null;
  loading?: boolean;
}

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: SummaryCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            color
          )}
        >
          <Icon
            size={20}
            strokeWidth={1.5}
            className="text-primary"
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm text-secondary-text">{label}</p>
          {loading ? (
            <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-200" />
          ) : (
            <p className="text-xl font-bold text-primary-text">
              {typeof value === 'number'
                ? value.toLocaleString('es-DO')
                : value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Summary cards row for the election-night dashboard.
 *
 * Shows: Total Votos, Recintos Reportando, Actas Registradas, Participacion.
 * Follows the same layout pattern as TurnoutStatsDisplay.
 */
export function VoteSummaryCards({ summary, loading }: VoteSummaryCardsProps) {
  const totalRecintos = summary?.total_recintos ?? 0;
  const reportando = summary?.recintos_reportados ?? 0;
  const porcentajeRecintos =
    totalRecintos > 0
      ? `${reportando}/${totalRecintos}`
      : '0/0';

  return (
    <div className="grid grid-cols-2 gap-space-4 lg:grid-cols-4">
      <SummaryCard
        label="Total Votos"
        value={summary?.total_votos ?? 0}
        icon={Vote}
        color="bg-blue-50"
        loading={loading}
      />
      <SummaryCard
        label="Recintos Reportando"
        value={porcentajeRecintos}
        icon={MapPin}
        color="bg-emerald-50"
        loading={loading}
      />
      <SummaryCard
        label="Actas Registradas"
        value={summary?.total_actas ?? 0}
        icon={FileText}
        color="bg-indigo-50"
        loading={loading}
      />
      <SummaryCard
        label="Participacion"
        value={
          totalRecintos > 0
            ? `${Math.round((reportando / totalRecintos) * 100)}%`
            : '0%'
        }
        icon={TrendingUp}
        color="bg-amber-50"
        loading={loading}
      />
    </div>
  );
}
