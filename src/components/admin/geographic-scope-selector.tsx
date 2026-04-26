'use client';

import { useEffect, useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Loader2 } from 'lucide-react';
import type { GeoEntity } from '@/types/admin';

interface GeographicScopeSelectorProps {
  /** Currently selected provincia ID */
  provinciaId: string | null;
  /** Currently selected municipio ID */
  municipioId: string | null;
  /** Currently selected circunscripcion ID */
  circunscripcionId: string | null;
  /** Callback when provincia changes */
  onProvinciaChange: (id: string | null) => void;
  /** Callback when municipio changes */
  onMunicipioChange: (id: string | null) => void;
  /** Callback when circunscripcion changes */
  onCircunscripcionChange: (id: string | null) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Cascading geographic scope selector.
 *
 * Three linked selects: Provincia -> Municipio -> Circunscripcion.
 * Each level filters the next. Selecting at a higher level clears
 * selections below it (assigning at provincia level means access
 * to all children).
 */
export function GeographicScopeSelector({
  provinciaId,
  municipioId,
  circunscripcionId,
  onProvinciaChange,
  onMunicipioChange,
  onCircunscripcionChange,
  disabled = false,
}: GeographicScopeSelectorProps) {
  const [provincias, setProvincias] = useState<GeoEntity[]>([]);
  const [municipios, setMunicipios] = useState<GeoEntity[]>([]);
  const [circunscripciones, setCircunscripciones] = useState<GeoEntity[]>([]);

  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingCircunscripciones, setLoadingCircunscripciones] = useState(false);

  // Fetch provincias on mount
  useEffect(() => {
    async function fetchProvincias() {
      setLoadingProvincias(true);
      try {
        const res = await fetch('/api/admin/geography?type=provincias');
        if (res.ok) {
          const json = await res.json();
          setProvincias(json.data ?? []);
        }
      } catch (err) {
        console.error('Error fetching provincias:', err);
      } finally {
        setLoadingProvincias(false);
      }
    }
    fetchProvincias();
  }, []);

  // Fetch municipios when provincia changes
  useEffect(() => {
    if (!provinciaId) {
      setMunicipios([]);
      return;
    }

    async function fetchMunicipios() {
      setLoadingMunicipios(true);
      try {
        const res = await fetch(
          `/api/admin/geography?type=municipios&provincia_id=${provinciaId}`
        );
        if (res.ok) {
          const json = await res.json();
          setMunicipios(json.data ?? []);
        }
      } catch (err) {
        console.error('Error fetching municipios:', err);
      } finally {
        setLoadingMunicipios(false);
      }
    }
    fetchMunicipios();
  }, [provinciaId]);

  // Fetch circunscripciones when municipio changes
  useEffect(() => {
    if (!municipioId) {
      setCircunscripciones([]);
      return;
    }

    async function fetchCircunscripciones() {
      setLoadingCircunscripciones(true);
      try {
        const res = await fetch(
          `/api/admin/geography?type=circunscripciones&municipio_id=${municipioId}`
        );
        if (res.ok) {
          const json = await res.json();
          setCircunscripciones(json.data ?? []);
        }
      } catch (err) {
        console.error('Error fetching circunscripciones:', err);
      } finally {
        setLoadingCircunscripciones(false);
      }
    }
    fetchCircunscripciones();
  }, [municipioId]);

  const handleProvinciaChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value || null;
      onProvinciaChange(value);
      // Clear child selections
      onMunicipioChange(null);
      onCircunscripcionChange(null);
    },
    [onProvinciaChange, onMunicipioChange, onCircunscripcionChange]
  );

  const handleMunicipioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value || null;
      onMunicipioChange(value);
      // Clear circunscripcion
      onCircunscripcionChange(null);
    },
    [onMunicipioChange, onCircunscripcionChange]
  );

  const handleCircunscripcionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value || null;
      onCircunscripcionChange(value);
    },
    [onCircunscripcionChange]
  );

  return (
    <div className="space-y-3">
      {/* Provincia */}
      <div className="space-y-1.5">
        <Label htmlFor="geo-provincia">
          Provincia
          {loadingProvincias && (
            <Loader2
              className="ml-1.5 inline-block h-3 w-3 animate-spin"
              aria-label="Cargando provincias"
            />
          )}
        </Label>
        <SelectNative
          id="geo-provincia"
          value={provinciaId ?? ''}
          onChange={handleProvinciaChange}
          disabled={disabled || loadingProvincias}
          placeholder="Seleccionar provincia"
        >
          <option value="">Sin asignar (todo el pais)</option>
          {provincias.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </SelectNative>
      </div>

      {/* Municipio -- only shown when a provincia is selected */}
      {provinciaId && (
        <div className="space-y-1.5">
          <Label htmlFor="geo-municipio">
            Municipio
            {loadingMunicipios && (
              <Loader2
                className="ml-1.5 inline-block h-3 w-3 animate-spin"
                aria-label="Cargando municipios"
              />
            )}
          </Label>
          <SelectNative
            id="geo-municipio"
            value={municipioId ?? ''}
            onChange={handleMunicipioChange}
            disabled={disabled || loadingMunicipios}
            placeholder="Seleccionar municipio"
          >
            <option value="">Toda la provincia</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </SelectNative>
        </div>
      )}

      {/* Circunscripcion -- only shown when a municipio is selected */}
      {municipioId && (
        <div className="space-y-1.5">
          <Label htmlFor="geo-circunscripcion">
            Circunscripcion
            {loadingCircunscripciones && (
              <Loader2
                className="ml-1.5 inline-block h-3 w-3 animate-spin"
                aria-label="Cargando circunscripciones"
              />
            )}
          </Label>
          <SelectNative
            id="geo-circunscripcion"
            value={circunscripcionId ?? ''}
            onChange={handleCircunscripcionChange}
            disabled={disabled || loadingCircunscripciones}
            placeholder="Seleccionar circunscripcion"
          >
            <option value="">Todo el municipio</option>
            {circunscripciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </SelectNative>
        </div>
      )}
    </div>
  );
}
