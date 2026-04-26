'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import type { RecintoTurnout } from '@/types/dashboard';

interface TurnoutByRecintoTableProps {
  data: RecintoTurnout[];
  loading?: boolean;
}

/**
 * Returns a Tailwind background color class based on turnout percentage.
 */
function getTurnoutColor(porcentaje: number): string {
  if (porcentaje >= 75) return 'bg-emerald-500';
  if (porcentaje >= 50) return 'bg-amber-500';
  if (porcentaje >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Compact table showing voter turnout by recinto.
 * Sorted by turnout percentage descending.
 * Includes a colored progress bar for visual indication.
 */
export function TurnoutByRecintoTable({
  data,
  loading,
}: TurnoutByRecintoTableProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-primary-text">
            Participacion por Recinto
          </p>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded bg-neutral-100"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex h-40 items-center justify-center p-4">
          <p className="text-sm text-placeholder">
            No hay datos de participacion disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by porcentaje descending
  const sorted = [...data].sort((a, b) => b.porcentaje - a.porcentaje);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="mb-3 text-sm font-semibold text-primary-text">
          Participacion por Recinto
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Recinto</TableHead>
                <TableHead className="text-right text-xs">Total</TableHead>
                <TableHead className="text-right text-xs">Votaron</TableHead>
                <TableHead className="text-right text-xs">
                  No Votaron
                </TableHead>
                <TableHead className="w-32 text-xs">Porcentaje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.recinto_id}>
                  <TableCell className="text-sm font-medium text-primary-text">
                    {row.recinto_nombre}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {row.total_miembros.toLocaleString('es-DO')}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-emerald-600">
                    {row.votaron.toLocaleString('es-DO')}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-red-600">
                    {row.no_votaron.toLocaleString('es-DO')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full rounded-full bg-neutral-100">
                        <div
                          className={`h-2 rounded-full transition-all ${getTurnoutColor(row.porcentaje)}`}
                          style={{ width: `${Math.min(row.porcentaje, 100)}%` }}
                        />
                      </div>
                      <span className="flex-shrink-0 text-xs font-medium tabular-nums text-secondary-text">
                        {row.porcentaje}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
