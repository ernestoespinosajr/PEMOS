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
import type { PartyVoteData } from '@/types/dashboard';

interface PartyBarChartProps {
  data: PartyVoteData[];
  loading?: boolean;
}

const DEFAULT_BAR_COLOR = '#6366f1'; // indigo-500 fallback

/**
 * Custom tooltip for the party bar chart.
 * Shows full party name, vote count, and recintos reporting.
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PartyVoteData }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]!.payload;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="text-sm font-semibold text-primary-text">
        {data.partido_nombre}
      </p>
      <p className="text-sm text-secondary-text">
        Votos: {data.total_votos.toLocaleString('es-DO')}
      </p>
      <p className="text-xs text-muted-foreground">
        Recintos: {data.recintos_reportados}
      </p>
    </div>
  );
}

/**
 * Bar chart showing vote totals by party.
 * Each bar is colored using the party's color from the database.
 */
export function PartyBarChart({ data, loading }: PartyBarChartProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-primary-text">
            Votos por Partido
          </p>
          <div className="h-72 animate-pulse rounded bg-neutral-100" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex h-80 items-center justify-center p-4">
          <p className="text-sm text-placeholder">
            No hay datos de votos disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data with label for X-axis
  const chartData = data.map((d) => ({
    ...d,
    label: d.partido_siglas ?? d.partido_nombre,
  }));

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="mb-3 text-sm font-semibold text-primary-text">
          Votos por Partido
        </p>
        <ResponsiveContainer width="100%" height={288}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(v: number) => v.toLocaleString('es-DO')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total_votos" radius={[4, 4, 0, 0]} maxBarSize={64}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.partido_color ?? DEFAULT_BAR_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
