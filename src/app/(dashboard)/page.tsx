import { BarChart3, Flag, TrendingUp, Users } from 'lucide-react';

const metrics = [
  {
    label: 'Total Miembros',
    value: '12,458',
    trend: '+4.5%',
    trendUp: true,
    icon: Users,
  },
  {
    label: 'Recintos Activos',
    value: '342',
    trend: '+2.1%',
    trendUp: true,
    icon: BarChart3,
  },
  {
    label: 'Candidatos',
    value: '28',
    trend: '0%',
    trendUp: true,
    icon: Flag,
  },
  {
    label: 'Cobertura Electoral',
    value: '87.3%',
    trend: '+1.2%',
    trendUp: true,
    icon: TrendingUp,
  },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Page Title */}
      <div className="mb-space-8">
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Dashboard
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Resumen general del sistema de monitoreo electoral
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-space-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="rounded-lg border border-border bg-surface p-space-6 shadow-sm transition-shadow duration-hover hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-secondary-text">
                  {metric.label}
                </p>
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className="text-placeholder"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-space-2 text-3xl font-bold tracking-tight text-primary-text">
                {metric.value}
              </p>
              <div className="mt-space-1 flex items-center gap-space-1">
                <TrendingUp
                  size={14}
                  strokeWidth={1.5}
                  className={metric.trendUp ? 'text-success' : 'text-error'}
                  aria-hidden="true"
                />
                <span
                  className={`text-xs font-medium ${
                    metric.trendUp ? 'text-success' : 'text-error'
                  }`}
                >
                  {metric.trend}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Placeholder sections */}
      <div className="mt-space-8 grid grid-cols-1 gap-space-6 lg:grid-cols-2">
        {/* Chart Placeholder */}
        <div className="rounded-lg border border-border bg-surface p-space-6 shadow-sm">
          <h3 className="text-lg font-semibold text-heading">
            Actividad Reciente
          </h3>
          <div className="mt-space-4 flex h-48 items-center justify-center rounded-md bg-neutral-50">
            <p className="text-sm text-placeholder">
              Grafico de actividad (por implementar)
            </p>
          </div>
        </div>

        {/* Table Placeholder */}
        <div className="rounded-lg border border-border bg-surface p-space-6 shadow-sm">
          <h3 className="text-lg font-semibold text-heading">
            Ultimas Actualizaciones
          </h3>
          <div className="mt-space-4 flex h-48 items-center justify-center rounded-md bg-neutral-50">
            <p className="text-sm text-placeholder">
              Tabla de actualizaciones (por implementar)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
