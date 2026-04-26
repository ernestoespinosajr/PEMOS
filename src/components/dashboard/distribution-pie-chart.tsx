'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { ChartEmptyState } from './chart-empty-state';
import { ChartSkeleton } from './dashboard-skeleton';
import { CHART_TOOLTIP_STYLE } from './chart-tooltip';
import type { DistributionSlice } from '@/hooks/use-distribution-chart-data';

interface DistributionPieChartProps {
  /** Chart data -- distribution slices with name, value, color. */
  data: DistributionSlice[];
  /** Whether data is currently loading. */
  isLoading: boolean;
}

/**
 * Custom label renderer for pie chart slices.
 * Shows percentage on the outside of the slice.
 * Uses PieLabelRenderProps and computes percentage from the `percent` field.
 */
function renderCustomLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);

  const pctDisplay = Math.round(percent * 1000) / 10;
  if (pctDisplay < 5) return null; // Hide labels for very small slices

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#525252"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontFamily="'Inter', system-ui, sans-serif"
    >
      {`${pctDisplay}%`}
    </text>
  );
}

/**
 * Custom tooltip content for the pie chart.
 */
function PieTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: DistributionSlice;
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  if (!item) return null;
  const slice = item.payload;

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <p
        style={{
          color: '#404040',
          fontWeight: 600,
          marginBottom: '4px',
        }}
      >
        {slice.name}
      </p>
      <p style={{ color: '#525252' }}>
        {slice.value.toLocaleString('es-DO')} miembros
      </p>
      <p style={{ color: '#737373', fontSize: '12px' }}>
        {slice.percentage}% del total
      </p>
    </div>
  );
}

/**
 * Pie/donut chart showing member distribution by role.
 *
 * Design-Criteria.md chart specification:
 * - Colors: primary #2D6A4F, primary-light #40916C, primary-100 #B7E4C7
 * - Labels showing percentage and role name
 * - Tooltip: surface white bg, shadow-md, rounded-md
 * - Responsive: fills container
 *
 * Accessibility:
 * - Container has aria-label summarizing the distribution
 * - Each slice percentage is visible as text labels
 */
export function DistributionPieChart({
  data,
  isLoading,
}: DistributionPieChartProps) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return <ChartEmptyState />;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const breakdown = data
    .map((d) => `${d.name}: ${d.percentage}%`)
    .join(', ');
  const ariaDescription = `Grafico circular de distribucion de ${total.toLocaleString('es-DO')} miembros por rol: ${breakdown}`;

  return (
    <div
      role="img"
      aria-label={ariaDescription}
      className="h-60 w-full sm:h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="65%"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<PieTooltipContent />} />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              color: '#737373',
              paddingTop: '4px',
            }}
            formatter={(value: string) => (
              <span style={{ color: '#737373', fontSize: '12px' }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
