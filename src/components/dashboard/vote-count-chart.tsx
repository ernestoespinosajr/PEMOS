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
import type { PartyVoteData } from '@/types/dashboard';

interface VoteCountChartProps {
  /** Party vote data from the by-party API endpoint. */
  data: PartyVoteData[];
  /** Whether data is currently loading. */
  loading?: boolean;
}

/**
 * Fallback color when a party has no color defined.
 */
const FALLBACK_COLOR = CHART_COLORS.primary;

/**
 * Custom tooltip for the live vote count chart.
 * Shows party name, vote count (formatted), and recintos reporting.
 */
function VoteCountTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PartyVoteData & { label: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]!.payload;
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <p className="font-semibold text-primary-text">
        {data.partido_nombre}
      </p>
      <p className="text-secondary-text">
        Votos: {data.total_votos.toLocaleString('es-DO')}
      </p>
      <p className="text-xs text-placeholder">
        Recintos reportando: {data.recintos_reportados}
      </p>
    </div>
  );
}

/**
 * Live vote count bar chart for the election-night dashboard.
 *
 * Displays vote totals by party with party-colored bars.
 * Uses short animation duration (300ms) for smooth transitions
 * when data updates via Realtime events, avoiding full re-renders.
 *
 * Falls back to the project's green palette when party colors
 * are not available in the data.
 */
export function VoteCountChart({ data, loading }: VoteCountChartProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-primary-text">
              Resultados en Vivo
            </p>
          </div>
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
            Resultados en Vivo
          </p>
          <ChartEmptyState message="No hay votos registrados" />
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data with label for X-axis (party abbreviation or name)
  const chartData = data
    .slice()
    .sort((a, b) => b.total_votos - a.total_votos)
    .map((d) => ({
      ...d,
      label: d.partido_siglas ?? d.partido_nombre,
    }));

  // Calculate grand total for percentage display
  const grandTotal = chartData.reduce((sum, d) => sum + d.total_votos, 0);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-primary-text">
            Resultados en Vivo
          </p>
          <p className="text-xs tabular-nums text-secondary-text">
            Total: {grandTotal.toLocaleString('es-DO')} votos
          </p>
        </div>

        <ResponsiveContainer width="100%" height={288}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <CartesianGrid {...CARTESIAN_GRID_PROPS} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK_STYLE}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.gridLine }}
            />
            <YAxis
              tick={AXIS_TICK_STYLE}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.gridLine }}
              tickFormatter={(v: number) => v.toLocaleString('es-DO')}
            />
            <Tooltip content={<VoteCountTooltip />} />
            <Bar
              dataKey="total_votos"
              radius={[4, 4, 0, 0]}
              maxBarSize={64}
              isAnimationActive={true}
              animationDuration={300}
              animationEasing="ease-out"
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
