'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import type { TimelineDataPoint } from '@/types/dashboard';

interface ResultsTimelineChartProps {
  data: TimelineDataPoint[];
  loading?: boolean;
}

/**
 * Formats an ISO timestamp for the chart X-axis.
 * Shows time only (HH:MM) for election-night readability.
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-DO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

/**
 * Custom tooltip for the timeline chart.
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {label ? formatTime(label) : ''}
      </p>
      {payload.map((item) => (
        <p
          key={item.name}
          className="text-sm"
          style={{ color: item.color }}
        >
          {item.name}: {item.value.toLocaleString('es-DO')}
        </p>
      ))}
    </div>
  );
}

/**
 * Line chart showing cumulative vote totals and acta counts over time.
 * X-axis: time buckets (HH:MM). Y-axis: cumulative counts.
 */
export function ResultsTimelineChart({
  data,
  loading,
}: ResultsTimelineChartProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-primary-text">
            Resultados en el Tiempo
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
            No hay datos de linea de tiempo disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data with formatted time labels
  const chartData = data.map((d) => ({
    ...d,
    timeLabel: formatTime(d.timestamp),
  }));

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="mb-3 text-sm font-semibold text-primary-text">
          Resultados en el Tiempo
        </p>
        <ResponsiveContainer width="100%" height={288}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timeLabel"
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
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="total_votos"
              name="Votos"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="actas_count"
              name="Actas"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
