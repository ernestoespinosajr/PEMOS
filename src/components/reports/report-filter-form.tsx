'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type {
  ReportDefinition,
  ReportFilters,
  ReportFilterField,
} from '@/types/reports';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeoOption {
  id: string;
  nombre: string;
}

interface ReportFilterFormProps {
  /** The selected report definition */
  report: ReportDefinition;
  /** Whether report generation is in progress */
  generating: boolean;
  /** Callback to generate the report with the current filters */
  onGenerate: (filters: ReportFilters) => void;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Labels for filter fields (Spanish)
// ---------------------------------------------------------------------------

const FILTER_LABELS: Record<ReportFilterField, string> = {
  provincia_id: 'Provincia',
  municipio_id: 'Municipio',
  circunscripcion_id: 'Circunscripcion',
  sector_id: 'Sector',
  comite_id: 'Comite',
  periodo_id: 'Periodo Electoral',
  date_from: 'Fecha Desde',
  date_to: 'Fecha Hasta',
  miembro_id: 'Miembro',
  usuario_id: 'Usuario',
  alliance_prefix: 'Alianza/Coalicion',
  nivel: 'Nivel Geografico',
  parent_id: 'Nivel Superior',
};

const NIVEL_OPTIONS = [
  { value: 'provincia', label: 'Provincia' },
  { value: 'municipio', label: 'Municipio' },
  { value: 'circunscripcion', label: 'Circunscripcion' },
  { value: 'sector', label: 'Sector' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ReportFilterForm -- Dynamic filter form for the report builder.
 *
 * Renders filter controls based on the selected report's `filters` array.
 * Geographic selectors are cascading (provincia -> municipio -> circunscripcion -> sector).
 * Date fields use native date inputs for accessibility.
 *
 * Follows the MemberFiltersBar pattern for geographic cascading and uses
 * the same design tokens (Label, SelectNative, Input, Button components).
 *
 * Accessibility:
 * - Every input has a visible Label connected via htmlFor/id
 * - Required fields indicated with aria-required
 * - Loading states announced via aria-busy
 * - Submit button announces generating state
 */
export function ReportFilterForm({
  report,
  generating,
  onGenerate,
  className,
}: ReportFilterFormProps) {
  const formId = useId();

  // Filter values
  const [filters, setFilters] = useState<ReportFilters>({});

  // Geographic cascade data
  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [municipios, setMunicipios] = useState<GeoOption[]>([]);
  const [circunscripciones, setCircunscripciones] = useState<GeoOption[]>([]);
  const [sectores, setSectores] = useState<GeoOption[]>([]);
  const [periodos, setPeriodos] = useState<GeoOption[]>([]);

  // Loading states
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingCircunscripciones, setLoadingCircunscripciones] = useState(false);
  const [loadingSectores, setLoadingSectores] = useState(false);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);

  // Which filter fields does this report need?
  const requiredFilters = report.filters;

  const hasFilter = (field: ReportFilterField) => requiredFilters.includes(field);

  // Reset filters when report changes
  useEffect(() => {
    setFilters({});
  }, [report.type]);

  // ---------- Geographic cascade loads ----------

  // Provincias
  useEffect(() => {
    if (!hasFilter('provincia_id')) return;
    let cancelled = false;
    async function load() {
      setLoadingProvincias(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('provincias')
          .select('id, nombre')
          .eq('estado', true)
          .order('nombre');
        if (!cancelled) setProvincias(data ?? []);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingProvincias(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.type]);

  // Municipios (depends on provincia_id)
  useEffect(() => {
    if (!hasFilter('municipio_id') || !filters.provincia_id) {
      setMunicipios([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingMunicipios(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('municipios')
          .select('id, nombre')
          .eq('provincia_id', filters.provincia_id!)
          .eq('estado', true)
          .order('nombre');
        if (!cancelled) setMunicipios(data ?? []);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingMunicipios(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.provincia_id, report.type]);

  // Circunscripciones (depends on municipio_id)
  useEffect(() => {
    if (!hasFilter('circunscripcion_id') || !filters.municipio_id) {
      setCircunscripciones([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingCircunscripciones(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('circunscripciones')
          .select('id, nombre')
          .eq('municipio_id', filters.municipio_id!)
          .eq('estado', true)
          .order('nombre');
        if (!cancelled) setCircunscripciones(data ?? []);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingCircunscripciones(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.municipio_id, report.type]);

  // Sectores (depends on circunscripcion_id)
  useEffect(() => {
    if (!hasFilter('sector_id') || !filters.circunscripcion_id) {
      setSectores([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingSectores(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('sectores')
          .select('id, nombre')
          .eq('circunscripcion_id', filters.circunscripcion_id!)
          .eq('estado', true)
          .order('nombre');
        if (!cancelled) setSectores(data ?? []);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingSectores(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.circunscripcion_id, report.type]);

  // Periodos
  useEffect(() => {
    if (!hasFilter('periodo_id')) return;
    let cancelled = false;
    async function load() {
      setLoadingPeriodos(true);
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('periodos')
          .select('id, nombre')
          .eq('estado', true)
          .order('nombre', { ascending: false });
        if (!cancelled) setPeriodos(data ?? []);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingPeriodos(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.type]);

  // ---------- Cascade-clear handler ----------

  const updateFilter = useCallback(
    (key: keyof ReportFilters, value: string) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value || null };

        // Cascade clear child geographic selections
        if (key === 'provincia_id') {
          next.municipio_id = null;
          next.circunscripcion_id = null;
          next.sector_id = null;
        }
        if (key === 'municipio_id') {
          next.circunscripcion_id = null;
          next.sector_id = null;
        }
        if (key === 'circunscripcion_id') {
          next.sector_id = null;
        }

        return next;
      });
    },
    []
  );

  // ---------- Submit ----------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate(filters);
  }

  // ---------- Render individual filter fields ----------

  function renderFilterField(field: ReportFilterField) {
    const fieldId = `${formId}-${field}`;
    const label = FILTER_LABELS[field];

    switch (field) {
      case 'provincia_id':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
              {loadingProvincias && (
                <Loader2
                  className="ml-1 inline-block h-3 w-3 animate-spin"
                  aria-label="Cargando provincias"
                />
              )}
            </Label>
            <SelectNative
              id={fieldId}
              value={filters.provincia_id ?? ''}
              onChange={(e) => updateFilter('provincia_id', e.target.value)}
              disabled={loadingProvincias}
            >
              <option value="">Todas</option>
              {provincias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </SelectNative>
          </div>
        );

      case 'municipio_id':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
              {loadingMunicipios && (
                <Loader2
                  className="ml-1 inline-block h-3 w-3 animate-spin"
                  aria-label="Cargando municipios"
                />
              )}
            </Label>
            <SelectNative
              id={fieldId}
              value={filters.municipio_id ?? ''}
              onChange={(e) => updateFilter('municipio_id', e.target.value)}
              disabled={!filters.provincia_id || loadingMunicipios}
            >
              <option value="">Todos</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </SelectNative>
          </div>
        );

      case 'circunscripcion_id':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
              {loadingCircunscripciones && (
                <Loader2
                  className="ml-1 inline-block h-3 w-3 animate-spin"
                  aria-label="Cargando circunscripciones"
                />
              )}
            </Label>
            <SelectNative
              id={fieldId}
              value={filters.circunscripcion_id ?? ''}
              onChange={(e) => updateFilter('circunscripcion_id', e.target.value)}
              disabled={!filters.municipio_id || loadingCircunscripciones}
            >
              <option value="">Todas</option>
              {circunscripciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </SelectNative>
          </div>
        );

      case 'sector_id':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
              {loadingSectores && (
                <Loader2
                  className="ml-1 inline-block h-3 w-3 animate-spin"
                  aria-label="Cargando sectores"
                />
              )}
            </Label>
            <SelectNative
              id={fieldId}
              value={filters.sector_id ?? ''}
              onChange={(e) => updateFilter('sector_id', e.target.value)}
              disabled={!filters.circunscripcion_id || loadingSectores}
            >
              <option value="">Todos</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </SelectNative>
          </div>
        );

      case 'periodo_id':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
              {loadingPeriodos && (
                <Loader2
                  className="ml-1 inline-block h-3 w-3 animate-spin"
                  aria-label="Cargando periodos"
                />
              )}
            </Label>
            <SelectNative
              id={fieldId}
              value={filters.periodo_id ?? ''}
              onChange={(e) => updateFilter('periodo_id', e.target.value)}
              disabled={loadingPeriodos}
              aria-required={
                report.type !== 'turnout_by_recinto' ? 'true' : undefined
              }
            >
              <option value="">Seleccione un periodo</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </SelectNative>
          </div>
        );

      case 'date_from':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
            </Label>
            <Input
              id={fieldId}
              type="date"
              value={filters.date_from ?? ''}
              onChange={(e) => updateFilter('date_from', e.target.value)}
            />
          </div>
        );

      case 'date_to':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
            </Label>
            <Input
              id={fieldId}
              type="date"
              value={filters.date_to ?? ''}
              onChange={(e) => updateFilter('date_to', e.target.value)}
              min={filters.date_from ?? undefined}
            />
          </div>
        );

      case 'nivel':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
            </Label>
            <SelectNative
              id={fieldId}
              value={filters.nivel ?? ''}
              onChange={(e) => updateFilter('nivel', e.target.value)}
              aria-required="true"
            >
              <option value="">Seleccione un nivel</option>
              {NIVEL_OPTIONS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </SelectNative>
          </div>
        );

      case 'alliance_prefix':
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
            </Label>
            <Input
              id={fieldId}
              type="text"
              value={filters.alliance_prefix ?? ''}
              onChange={(e) => updateFilter('alliance_prefix', e.target.value)}
              placeholder="Ej: PLD, PRM"
              maxLength={20}
            />
          </div>
        );

      case 'comite_id':
      case 'miembro_id':
      case 'usuario_id':
      case 'parent_id':
        // UUID text input for ID-based filters
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {label}
            </Label>
            <Input
              id={fieldId}
              type="text"
              value={(filters[field] as string) ?? ''}
              onChange={(e) => updateFilter(field, e.target.value)}
              placeholder={`ID de ${label.toLowerCase()}`}
            />
          </div>
        );

      default:
        return null;
    }
  }

  // ---------- Render ----------

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-space-4', className)}
      aria-label={`Filtros para ${report.name}`}
    >
      {/* Report info header */}
      <div>
        <h3 className="text-lg font-semibold text-primary-text">
          {report.name}
        </h3>
        <p className="mt-space-1 text-sm text-secondary-text">
          {report.description}
        </p>
      </div>

      {/* Filter fields grid */}
      {requiredFilters.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requiredFilters.map((field) => renderFilterField(field))}
        </div>
      )}

      {/* Generate button */}
      <div className="flex items-center gap-space-3">
        <Button type="submit" disabled={generating}>
          {generating ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Generando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
              Generar Reporte
            </>
          )}
        </Button>

        {requiredFilters.length === 0 && (
          <span className="text-xs text-secondary-text">
            Este reporte no requiere filtros
          </span>
        )}
      </div>
    </form>
  );
}
