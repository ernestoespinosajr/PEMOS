'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { MemberFilters } from '@/types/member';
import {
  DEFAULT_MEMBER_FILTERS,
  TIPO_MIEMBRO_LABELS,
} from '@/types/member';
import type { MemberType } from '@/types/member';

interface GeoOption {
  id: string;
  nombre: string;
}

interface MemberFiltersProps {
  filters: MemberFilters;
  onFiltersChange: (filters: MemberFilters) => void;
  className?: string;
}

/**
 * Search and filter bar for the member list.
 *
 * Features:
 * - Text search (name + cedula)
 * - Tipo de miembro dropdown
 * - Cascading geographic filters: Provincia -> Municipio -> Circunscripcion -> Sector
 * - Estado filter (Activo / Inactivo / Todos)
 * - Collapsible filter section on mobile
 * - Clear all filters button
 */
export function MemberFiltersBar({
  filters,
  onFiltersChange,
  className,
}: MemberFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Geographic data
  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [municipios, setMunicipios] = useState<GeoOption[]>([]);
  const [circunscripciones, setCircunscripciones] = useState<GeoOption[]>([]);
  const [sectores, setSectores] = useState<GeoOption[]>([]);

  // Loading states
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingCircunscripciones, setLoadingCircunscripciones] = useState(false);
  const [loadingSectores, setLoadingSectores] = useState(false);

  const hasActiveFilters =
    filters.tipo_miembro !== '' ||
    filters.provincia_id !== '' ||
    filters.municipio_id !== '' ||
    filters.circunscripcion_id !== '' ||
    filters.sector_id !== '' ||
    filters.estado !== 'all';

  // Fetch provincias on mount
  useEffect(() => {
    async function load() {
      setLoadingProvincias(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('provincias')
          .select('id, nombre')
          .eq('estado', true)
          .order('nombre');
        setProvincias(data ?? []);
      } catch {
        // Silently fail -- filter just won't have options
      } finally {
        setLoadingProvincias(false);
      }
    }
    load();
  }, []);

  // Fetch municipios when provincia changes
  useEffect(() => {
    if (!filters.provincia_id) {
      setMunicipios([]);
      return;
    }
    async function load() {
      setLoadingMunicipios(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('municipios')
          .select('id, nombre')
          .eq('provincia_id', filters.provincia_id)
          .eq('estado', true)
          .order('nombre');
        setMunicipios(data ?? []);
      } catch {
        // Silently fail
      } finally {
        setLoadingMunicipios(false);
      }
    }
    load();
  }, [filters.provincia_id]);

  // Fetch circunscripciones when municipio changes
  useEffect(() => {
    if (!filters.municipio_id) {
      setCircunscripciones([]);
      return;
    }
    async function load() {
      setLoadingCircunscripciones(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('circunscripciones')
          .select('id, nombre')
          .eq('municipio_id', filters.municipio_id)
          .eq('estado', true)
          .order('nombre');
        setCircunscripciones(data ?? []);
      } catch {
        // Silently fail
      } finally {
        setLoadingCircunscripciones(false);
      }
    }
    load();
  }, [filters.municipio_id]);

  // Fetch sectores when circunscripcion changes
  useEffect(() => {
    if (!filters.circunscripcion_id) {
      setSectores([]);
      return;
    }
    async function load() {
      setLoadingSectores(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('sectores')
          .select('id, nombre')
          .eq('circunscripcion_id', filters.circunscripcion_id)
          .eq('estado', true)
          .order('nombre');
        setSectores(data ?? []);
      } catch {
        // Silently fail
      } finally {
        setLoadingSectores(false);
      }
    }
    load();
  }, [filters.circunscripcion_id]);

  const updateFilter = useCallback(
    <K extends keyof MemberFilters>(key: K, value: MemberFilters[K]) => {
      const next = { ...filters, [key]: value, page: 1 };

      // Cascade clear child selections when parent changes
      if (key === 'provincia_id') {
        next.municipio_id = '';
        next.circunscripcion_id = '';
        next.sector_id = '';
      }
      if (key === 'municipio_id') {
        next.circunscripcion_id = '';
        next.sector_id = '';
      }
      if (key === 'circunscripcion_id') {
        next.sector_id = '';
      }

      onFiltersChange(next);
    },
    [filters, onFiltersChange]
  );

  function handleClearFilters() {
    onFiltersChange({ ...DEFAULT_MEMBER_FILTERS, search: filters.search });
  }

  function handleClearAll() {
    onFiltersChange(DEFAULT_MEMBER_FILTERS);
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search + Toggle Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar por nombre o cedula..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9 pr-9"
            aria-label="Buscar miembros por nombre o cedula"
          />
          {filters.search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => updateFilter('search', '')}
              aria-label="Limpiar busqueda"
            >
              <X size={14} strokeWidth={1.5} aria-hidden="true" />
            </Button>
          )}
        </div>

        {/* Filter toggle (mobile) + Clear all */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden"
            aria-expanded={showFilters}
            aria-controls="member-filters-panel"
          >
            <SlidersHorizontal size={16} className="mr-2" aria-hidden="true" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                !
              </span>
            )}
          </Button>
          {(hasActiveFilters || filters.search) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-muted-foreground"
            >
              <X size={14} className="mr-1" aria-hidden="true" />
              Limpiar todo
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <div
        id="member-filters-panel"
        className={cn(
          'grid gap-3 sm:grid-cols-2 lg:grid-cols-5',
          // Hidden on mobile unless toggled, always visible on sm+
          showFilters ? 'grid' : 'hidden sm:grid'
        )}
      >
        {/* Tipo de miembro */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-tipo" className="text-xs text-muted-foreground">
            Tipo de miembro
          </Label>
          <SelectNative
            id="filter-tipo"
            value={filters.tipo_miembro}
            onChange={(e) =>
              updateFilter('tipo_miembro', e.target.value as MemberType | '')
            }
          >
            <option value="">Todos</option>
            {(Object.keys(TIPO_MIEMBRO_LABELS) as MemberType[]).map((key) => (
              <option key={key} value={key}>
                {TIPO_MIEMBRO_LABELS[key]}
              </option>
            ))}
          </SelectNative>
        </div>

        {/* Provincia */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-provincia" className="text-xs text-muted-foreground">
            Provincia
            {loadingProvincias && (
              <Loader2
                className="ml-1 inline-block h-3 w-3 animate-spin"
                aria-label="Cargando provincias"
              />
            )}
          </Label>
          <SelectNative
            id="filter-provincia"
            value={filters.provincia_id}
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

        {/* Municipio */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-municipio" className="text-xs text-muted-foreground">
            Municipio
            {loadingMunicipios && (
              <Loader2
                className="ml-1 inline-block h-3 w-3 animate-spin"
                aria-label="Cargando municipios"
              />
            )}
          </Label>
          <SelectNative
            id="filter-municipio"
            value={filters.municipio_id}
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

        {/* Circunscripcion */}
        {filters.municipio_id && (
          <div className="space-y-1.5">
            <Label
              htmlFor="filter-circunscripcion"
              className="text-xs text-muted-foreground"
            >
              Circunscripcion
              {loadingCircunscripciones && (
                <Loader2
                  className="ml-1 inline-block h-3 w-3 animate-spin"
                  aria-label="Cargando circunscripciones"
                />
              )}
            </Label>
            <SelectNative
              id="filter-circunscripcion"
              value={filters.circunscripcion_id}
              onChange={(e) => updateFilter('circunscripcion_id', e.target.value)}
              disabled={loadingCircunscripciones}
            >
              <option value="">Todas</option>
              {circunscripciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </SelectNative>
          </div>
        )}

        {/* Sector */}
        {filters.circunscripcion_id && (
          <div className="space-y-1.5">
            <Label htmlFor="filter-sector" className="text-xs text-muted-foreground">
              Sector
              {loadingSectores && (
                <Loader2
                  className="ml-1 inline-block h-3 w-3 animate-spin"
                  aria-label="Cargando sectores"
                />
              )}
            </Label>
            <SelectNative
              id="filter-sector"
              value={filters.sector_id}
              onChange={(e) => updateFilter('sector_id', e.target.value)}
              disabled={loadingSectores}
            >
              <option value="">Todos</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </SelectNative>
          </div>
        )}

        {/* Estado */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-estado" className="text-xs text-muted-foreground">
            Estado
          </Label>
          <SelectNative
            id="filter-estado"
            value={filters.estado}
            onChange={(e) =>
              updateFilter('estado', e.target.value as MemberFilters['estado'])
            }
          >
            <option value="all">Todos</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </SelectNative>
        </div>
      </div>

      {/* Active filter indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtros activos</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
