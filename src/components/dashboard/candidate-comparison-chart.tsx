'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { ChartEmptyState } from './chart-empty-state';
import {
  CHART_TOOLTIP_STYLE,
  AXIS_TICK_STYLE,
  CARTESIAN_GRID_PROPS,
  CHART_COLORS,
} from './chart-tooltip';
import type { CandidateVoteData } from '@/types/dashboard';

interface CandidateComparisonChartProps {
  /** Candidate vote data from the by-candidate API endpoint. */
  data: CandidateVoteData[];
  /** Whether data is currently loading. */
  loading?: boolean;
}

const FALLBACK_COLOR = CHART_COLORS.primary;

/**
 * Custom tooltip for the candidate comparison chart.
 */
function CandidateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: CandidateVoteData & { label: string };
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]!.payload;
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <p className="font-semibold text-primary-text">
        {data.candidato_nombre}
      </p>
      <p className="text-xs text-secondary-text">
        {data.partido_nombre}
        {data.partido_siglas ? ` (${data.partido_siglas})` : ''}
      </p>
      <p className="mt-1 text-secondary-text">
        Votos: {data.total_votos.toLocaleString('es-DO')}
      </p>
      <p className="text-xs text-placeholder">
        {data.porcentaje}% del total
      </p>
    </div>
  );
}

/**
 * Horizontal bar chart comparing candidate vote totals side-by-side.
 *
 * Ordered by vote count descending. Each bar is colored with the
 * candidate's party color. Shows candidate name, party abbreviation,
 * vote count, and percentage of total.
 *
 * Uses horizontal layout (layout="vertical") so candidate names
 * display on the Y-axis and vote counts extend horizontally,
 * making it easy to compare magnitudes at a glance.
 */
export function CandidateComparisonChart({
  data,
  loading,
}: CandidateComparisonChartProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-primary-text">
            Comparacion de Candidatos
          </p>
          <div className="h-72 animate-pulse rounded bg-neutral-100" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-primary-text">
            Comparacion de Candidatos
          </p>
          <ChartEmptyState message="No hay candidatos con votos registrados" />
        </CardContent>
      </Card>
    );
  }

  // Sort descending by vote count and prepare labels
  const chartData = data
    .slice()
    .sort((a, b) => b.total_votos - a.total_votos)
    .map((d) => ({
      ...d,
      label: d.candidato_nombre,
    }));

  // Dynamic height based on number of candidates (40px per candidate, min 200px)
  const chartHeight = Math.max(chartData.length * 40, 200);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="mb-3 text-sm font-semibold text-primary-text">
          Comparacion de Candidatos
        </p>

        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
          >
            <CartesianGrid
              {...CARTESIAN_GRID_PROPS}
              horizontal={false}
              vertical={true}
            />
            <XAxis
              type="number"
              tick={AXIS_TICK_STYLE}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.gridLine }}
              tickFormatter={(v: number) => v.toLocaleString('es-DO')}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ ...AXIS_TICK_STYLE, width: 120 }}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.gridLine }}
              width={130}
            />
            <Tooltip content={<CandidateTooltip />} />
            <Bar
              dataKey="total_votos"
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
              isAnimationActive={true}
              animationDuration={300}
              animationEasing="ease-out"
              label={{
                position: 'right',
                fill: CHART_COLORS.axisLabel,
                fontSize: 11,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts LabelFormatter type is overly restrictive
                formatter: ((value: number) => value.toLocaleString('es-DO')) as any,
              }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.partido_color ?? FALLBACK_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
