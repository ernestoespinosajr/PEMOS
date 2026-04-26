'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartEmptyState } from './chart-empty-state';
import { ChartSkeleton } from './dashboard-skeleton';
import {
  CHART_COLORS,
  TOOLTIP_PROPS,
  AXIS_TICK_STYLE,
  CARTESIAN_GRID_PROPS,
} from './chart-tooltip';
import type { MemberCountByLevel } from '@/hooks/use-member-chart-data';

interface MemberBarChartProps {
  /** Chart data -- member counts by geographic level. */
  data: MemberCountByLevel[];
  /** Whether data is currently loading. */
  isLoading: boolean;
}

/**
 * Bar chart showing member counts by geographic level.
 *
 * Design-Criteria.md chart specification:
 * - Green palette: primary #2D6A4F, primary-light #40916C, primary-100 #B7E4C7
 * - Rounded top corners on bars (radius: [4, 4, 0, 0])
 * - Horizontal dashed grid lines only (#E5E5E5)
 * - text-xs axis labels in secondary-text color (#737373)
 * - Tooltip: surface white bg, shadow-md, rounded-md
 * - Responsive: fills container, minimum 240px height
 *
 * Accessibility:
 * - Container has aria-label describing the chart data
 * - Decorative chart elements hidden from screen readers
 */
export function MemberBarChart({ data, isLoading }: MemberBarChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <ChartEmptyState />;
  }

  const total = data.reduce((sum, d) => sum + d.total, 0);
  const ariaDescription = `Grafico de barras mostrando ${data.length} niveles geograficos con un total de ${total.toLocaleString('es-DO')} miembros`;

  return (
    <div
      role="img"
      aria-label={ariaDescription}
      className="h-60 w-full sm:h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid {...CARTESIAN_GRID_PROPS} />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK_STYLE}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.gridLine }}
            interval={0}
            angle={data.length > 6 ? -45 : 0}
            textAnchor={data.length > 6 ? 'end' : 'middle'}
            height={data.length > 6 ? 60 : 30}
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
                name === 'coordinadores'
                  ? 'Coordinadores'
                  : name === 'multiplicadores'
                    ? 'Multiplicadores'
                    : 'Relacionados';
              return [formatted, label];
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              color: '#737373',
              paddingTop: '8px',
            }}
            formatter={(value: string) =>
              value === 'coordinadores'
                ? 'Coordinadores'
                : value === 'multiplicadores'
                  ? 'Multiplicadores'
                  : 'Relacionados'
            }
          />
          <Bar
            dataKey="coordinadores"
            fill={CHART_COLORS.primary}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
          <Bar
            dataKey="multiplicadores"
            fill={CHART_COLORS.primaryLight}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
          <Bar
            dataKey="relacionados"
            fill={CHART_COLORS.primary100}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
