'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { SelectNative } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { DashboardFilters, FilterOption } from '@/types/dashboard';
import { DEFAULT_DASHBOARD_FILTERS } from '@/types/dashboard';

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

/**
 * Filter bar for the election-night dashboard.
 *
 * Three cascading dropdowns: Circunscripcion > Municipio > Recinto.
 * Selecting a parent filter narrows the options in child filters.
 * "Limpiar filtros" button resets all filters.
 */
export function DashboardFiltersBar({
  filters,
  onChange,
}: DashboardFiltersBarProps) {
  const [circunscripciones, setCircunscripciones] = useState<FilterOption[]>(
    []
  );
  const [municipios, setMunicipios] = useState<FilterOption[]>([]);
  const [recintos, setRecintos] = useState<FilterOption[]>([]);
  const [loadingCirc, setLoadingCirc] = useState(true);
  const [loadingMun, setLoadingMun] = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);

  // Fetch circunscripciones on mount
  useEffect(() => {
    async function fetch() {
      setLoadingCirc(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('circunscripciones')
          .select('id, nombre')
          .eq('estado', true)
          .order('nombre');

        setCircunscripciones((data ?? []) as FilterOption[]);
      } catch (err) {
        console.error('Error fetching circunscripciones:', err);
      } finally {
        setLoadingCirc(false);
      }
    }
    fetch();
  }, []);

  // Fetch municipios when circunscripcion changes
  useEffect(() => {
    async function fetch() {
      if (!filters.circunscripcion_id) {
        setMunicipios([]);
        return;
      }

      setLoadingMun(true);
      try {
        const supabase = createClient();
        // Circunscripciones are children of municipios (circunscripciones.municipio_id -> municipios.id).
        // Use an inner join to find the municipio(s) that contain the selected circunscripcion.
        const { data: rawData } = await supabase
          .from('municipios')
          .select('id, nombre, circunscripciones!inner(id)')
          .eq('circunscripciones.id', filters.circunscripcion_id)
          .eq('estado', true)
          .order('nombre');

        // Strip the joined relation so the result matches FilterOption[]
        const data = (rawData ?? []).map(({ id, nombre }) => ({ id, nombre }));

        setMunicipios((data ?? []) as FilterOption[]);
      } catch (err) {
        console.error('Error fetching municipios:', err);
      } finally {
        setLoadingMun(false);
      }
    }
    fetch();
  }, [filters.circunscripcion_id]);

  // Fetch recintos when municipio changes
  useEffect(() => {
    async function fetch() {
      if (!filters.municipio_id) {
        setRecintos([]);
        return;
      }

      setLoadingRec(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('recintos')
          .select('id, nombre')
          .eq('municipio_id', filters.municipio_id)
          .eq('estado', true)
          .order('nombre');

        setRecintos((data ?? []) as FilterOption[]);
      } catch (err) {
        console.error('Error fetching recintos:', err);
      } finally {
        setLoadingRec(false);
      }
    }
    fetch();
  }, [filters.municipio_id]);

  function handleCircChange(value: string) {
    onChange({
      circunscripcion_id: value,
      municipio_id: '',
      recinto_id: '',
    });
  }

  function handleMunChange(value: string) {
    onChange({
      ...filters,
      municipio_id: value,
      recinto_id: '',
    });
  }

  function handleRecChange(value: string) {
    onChange({
      ...filters,
      recinto_id: value,
    });
  }

  function handleClear() {
    onChange(DEFAULT_DASHBOARD_FILTERS);
  }

  const hasFilters =
    filters.circunscripcion_id ||
    filters.municipio_id ||
    filters.recinto_id;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Circunscripcion */}
      <div className="min-w-[180px] flex-1">
        <Label className="mb-1.5 block text-xs font-medium">
          Circunscripcion
        </Label>
        {loadingCirc ? (
          <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <SelectNative
            value={filters.circunscripcion_id}
            onChange={(e) => handleCircChange(e.target.value)}
            placeholder="Todas"
          >
            <option value="">Todas</option>
            {circunscripciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {/* Municipio */}
      <div className="min-w-[180px] flex-1">
        <Label className="mb-1.5 block text-xs font-medium">Municipio</Label>
        {loadingMun ? (
          <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <SelectNative
            value={filters.municipio_id}
            onChange={(e) => handleMunChange(e.target.value)}
            placeholder="Todos"
            disabled={!filters.circunscripcion_id}
          >
            <option value="">Todos</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {/* Recinto */}
      <div className="min-w-[180px] flex-1">
        <Label className="mb-1.5 block text-xs font-medium">Recinto</Label>
        {loadingRec ? (
          <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <SelectNative
            value={filters.recinto_id}
            onChange={(e) => handleRecChange(e.target.value)}
            placeholder="Todos"
            disabled={!filters.municipio_id}
          >
            <option value="">Todos</option>
            {recintos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="mb-0.5 text-xs text-muted-foreground"
        >
          <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
