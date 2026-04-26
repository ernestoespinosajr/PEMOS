'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { createClient } from '@/lib/supabase/client';
import type { ConversionRateRow, ConversionReportFilters } from '@/types/seguimiento';
import { DEFAULT_CONVERSION_FILTERS } from '@/types/seguimiento';

/**
 * Conversion rate report with geographic and date filters.
 * Calls get_conversion_rates RPC and displays funnel metrics.
 */
export function ConversionReport() {
  const [filters, setFilters] = useState<ConversionReportFilters>(
    DEFAULT_CONVERSION_FILTERS
  );
  const [data, setData] = useState<ConversionRateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState<Array<{ id: string; nombre: string }>>([]);

  // Fetch geographic areas when area_type changes
  useEffect(() => {
    async function fetchAreas() {
      if (!filters.area_type) {
        setAreas([]);
        return;
      }

      const supabase = createClient();
      const tableMap: Record<string, string> = {
        provincia: 'provincias',
        municipio: 'municipios',
        circunscripcion: 'circunscripciones',
        recinto: 'recintos',
      };

      const tableName = tableMap[filters.area_type] as
        | 'provincias'
        | 'municipios'
        | 'circunscripciones'
        | 'recintos';
      if (!tableName) return;

      const { data: areaData } = await supabase
        .from(tableName)
        .select('id, nombre')
        .eq('estado', true as never)
        .order('nombre');

      setAreas((areaData as unknown as Array<{ id: string; nombre: string }>) ?? []);
    }

    fetchAreas();
  }, [filters.area_type]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get active partido_id
      const { data: activePeriodo } = await supabase
        .from('periodos_electorales')
        .select('partido_id')
        .eq('activo', true)
        .eq('estado', true)
        .limit(1)
        .maybeSingle();

      const params: Record<string, unknown> = {
        p_area_type: filters.area_type || null,
        p_area_id: filters.area_id || null,
        p_fecha_inicio: filters.fecha_inicio || null,
        p_fecha_fin: filters.fecha_fin || null,
        p_partido_id: activePeriodo?.partido_id ?? null,
      };

      const { data: reportData, error } = await supabase.rpc(
        'get_conversion_rates',
        params
      );

      if (error) {
        console.error('Error fetching conversion rates:', error);
        return;
      }

      setData((reportData ?? []) as ConversionRateRow[]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Totals for the summary
  const totals = data.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      contactados: acc.contactados + row.contactados,
      registrados: acc.registrados + row.registrados,
      rechazados: acc.rechazados + row.rechazados,
      pendientes: acc.pendientes + row.pendientes,
    }),
    { total: 0, contactados: 0, registrados: 0, rechazados: 0, pendientes: 0 }
  );

  const tasaTotal =
    totals.total > 0
      ? Math.round((totals.registrados / totals.total) * 1000) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Nivel Geografico
            </Label>
            <SelectNative
              value={filters.area_type}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  area_type: e.target.value as ConversionReportFilters['area_type'],
                  area_id: '',
                }))
              }
              placeholder="Todos"
            >
              <option value="provincia">Provincia</option>
              <option value="municipio">Municipio</option>
              <option value="circunscripcion">Circunscripcion</option>
              <option value="recinto">Recinto</option>
            </SelectNative>
          </div>

          {filters.area_type && (
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Area</Label>
              <SelectNative
                value={filters.area_id}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, area_id: e.target.value }))
                }
                placeholder="Todas"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </SelectNative>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Fecha Inicio
            </Label>
            <Input
              type="date"
              value={filters.fecha_inicio}
              onChange={(e) =>
                setFilters((f) => ({ ...f, fecha_inicio: e.target.value }))
              }
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Fecha Fin
            </Label>
            <Input
              type="date"
              value={filters.fecha_fin}
              onChange={(e) =>
                setFilters((f) => ({ ...f, fecha_fin: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={fetchReport} disabled={loading} size="sm">
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Generar Reporte
          </Button>
        </div>
      </div>

      {/* Summary funnel */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryCard label="Total" value={totals.total} color="bg-neutral-100" />
          <SummaryCard
            label="Contactados"
            value={totals.contactados}
            color="bg-blue-100"
          />
          <SummaryCard
            label="Registrados"
            value={totals.registrados}
            color="bg-emerald-100"
          />
          <SummaryCard
            label="Rechazados"
            value={totals.rechazados}
            color="bg-red-100"
          />
          <SummaryCard
            label="Tasa Conversion"
            value={`${tasaTotal}%`}
            color="bg-primary-tint"
            icon={
              <TrendingUp
                size={16}
                className="text-primary"
                aria-hidden="true"
              />
            }
          />
        </div>
      )}

      {/* Detail table */}
      {data.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-neutral-50/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Area
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Contactados
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Registrados
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Rechazados
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Pendientes
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Tasa
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={row.area_id ?? `row-${i}`}
                    className="border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-primary-text">
                      {row.area_nombre ?? 'Total'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.total}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-600">
                      {row.contactados}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">
                      {row.registrados}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">
                      {row.rechazados}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.pendientes}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                      {row.tasa_conversion}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-surface">
          <p className="text-sm text-placeholder">
            Presione &quot;Generar Reporte&quot; para ver las tasas de conversion.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Helper component ----------

function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg ${color} p-3`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-1 text-xl font-bold text-primary-text">{value}</p>
    </div>
  );
}
