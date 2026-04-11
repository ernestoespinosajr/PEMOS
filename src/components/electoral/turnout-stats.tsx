'use client';

import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TurnoutStats } from '@/types/electoral';

interface TurnoutStatsProps {
  stats: TurnoutStats;
  loading?: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, color, loading }: StatCardProps) {
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
              {typeof value === 'number' ? value.toLocaleString('es-DO') : value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TurnoutStatsDisplay({ stats, loading }: TurnoutStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-space-4 lg:grid-cols-4">
      <StatCard
        label="Total Miembros"
        value={stats.total}
        icon={Users}
        color="bg-blue-50"
        loading={loading}
      />
      <StatCard
        label="Votaron"
        value={stats.votaron}
        icon={UserCheck}
        color="bg-emerald-50"
        loading={loading}
      />
      <StatCard
        label="No Votaron"
        value={stats.no_votaron}
        icon={UserX}
        color="bg-amber-50"
        loading={loading}
      />
      <StatCard
        label="Participacion"
        value={`${stats.porcentaje}%`}
        icon={TrendingUp}
        color="bg-indigo-50"
        loading={loading}
      />
    </div>
  );
}
