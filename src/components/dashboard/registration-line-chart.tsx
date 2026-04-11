'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartEmptyState } from './chart-empty-state';
import { ChartSkeleton } from './dashboard-skeleton';
import {
  CHART_COLORS,
  TOOLTIP_PROPS,
  AXIS_TICK_STYLE,
  CARTESIAN_GRID_PROPS,
} from './chart-tooltip';
import type { RegistrationDataPoint } from '@/hooks/use-registration-chart-data';

interface RegistrationLineChartProps {
  /** Chart data -- registration counts over time. */
  data: RegistrationDataPoint[];
  /** Whether data is currently loading. */
  isLoading: boolean;
}

/**
 * Line/area chart tracking registration progress over time.
 *
 * Design-Criteria.md chart specification:
 * - Area fill with primary-tint #D8F3DC
 * - Line stroke with primary #2D6A4F
 * - Horizontal dashed grid lines only (#E5E5E5)
 * - text-xs axis labels in secondary-text color (#737373)
 * - Tooltip: surface white bg, shadow-md, rounded-md
 * - Responsive: fills container, minimum 240px height
 *
 * Accessibility:
 * - Container has aria-label describing the data trend
 * - Chart elements are decorative (screen readers get the summary)
 */
export function RegistrationLineChart({
  data,
  isLoading,
}: RegistrationLineChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <ChartEmptyState />;
  }

  const lastItem = data[data.length - 1];
  const firstItem = data[0];
  const totalRegistrations = lastItem?.cumulative ?? 0;
  const dateRange =
    data.length > 1 && firstItem && lastItem
      ? `desde ${firstItem.date} hasta ${lastItem.date}`
      : firstItem?.date ?? '';
  const ariaDescription = `Grafico de linea mostrando progreso de registro con ${totalRegistrations.toLocaleString('es-DO')} registros acumulados ${dateRange}`;

  return (
    <div
      role="img"
      aria-label={ariaDescription}
      className="h-60 w-full sm:h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="registrationGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={CHART_COLORS.primaryTint}
                stopOpacity={0.8}
              />
              <stop
                offset="100%"
                stopColor={CHART_COLORS.primaryTint}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <CartesianGrid {...CARTESIAN_GRID_PROPS} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.gridLine }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
            }
          />
          <Tooltip
            {...TOOLTIP_PROPS}
            formatter={(value, name) => {
              const formatted =
                typeof value === 'number'
                  ? value.toLocaleString('es-DO')
                  : String(value ?? 0);
              const label =
                name === 'cumulative' ? 'Total acumulado' : 'Registros del dia';
              return [formatted, label];
            }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#registrationGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: CHART_COLORS.primary,
              stroke: '#FFFFFF',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
