'use client';

import { Building2, HardDrive, Users, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------- Types ----------

interface UsageMetric {
  label: string;
  value: number | string;
  icon: React.ElementType;
  format?: 'number' | 'storage';
}

interface TenantUsageCardProps {
  nombre: string;
  userCount: number;
  memberCount: number;
  /** Storage used in MB */
  storageUsedMB?: number;
  className?: string;
}

// ---------- Helpers ----------

function formatStorage(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

// ---------- Component ----------

/**
 * TenantUsageCard
 *
 * Displays tenant usage metrics in a compact card.
 * Used in both the platform admin tenant detail page
 * and the tenant admin organization settings page.
 */
export function TenantUsageCard({
  nombre,
  userCount,
  memberCount,
  storageUsedMB = 0,
  className,
}: TenantUsageCardProps) {
  const metrics: UsageMetric[] = [
    {
      label: 'Usuarios',
      value: userCount.toLocaleString('es-DO'),
      icon: Users,
    },
    {
      label: 'Miembros',
      value: memberCount.toLocaleString('es-DO'),
      icon: UserCheck,
    },
    {
      label: 'Almacenamiento',
      value: formatStorage(storageUsedMB),
      icon: HardDrive,
    },
  ];

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-space-6',
        className
      )}
    >
      <div className="mb-space-4 flex items-center gap-space-2">
        <Building2
          size={20}
          strokeWidth={1.5}
          className="text-slate-400"
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold text-slate-900">
          Uso de {nombre}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-space-4 sm:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-md border border-slate-100 bg-slate-50 p-space-4"
            >
              <div className="flex items-center gap-space-2">
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className="text-slate-400"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {metric.label}
                </span>
              </div>
              <p className="mt-space-2 text-2xl font-bold tracking-tight text-slate-900">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
