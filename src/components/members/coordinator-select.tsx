'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, X, UserCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { formatCedula } from '@/types/member';
import type { CoordinatorOption } from '@/types/member';

interface CoordinatorSelectProps {
  /** Currently selected coordinator ID. */
  value: string | null;
  /** Called when the coordinator changes. */
  onChange: (id: string | null) => void;
  /** Whether the field is disabled. */
  disabled?: boolean;
  /** HTML id for the input (for label association). */
  id?: string;
  /** aria-describedby for error association. */
  'aria-describedby'?: string;
  /** aria-invalid for error state. */
  'aria-invalid'?: boolean;
}

/**
 * Searchable select for choosing a coordinator.
 *
 * Fetches coordinators from miembros where tipo_miembro = 'coordinador'.
 * Supports searching by name or cedula. Shows a dropdown of matches
 * with name + formatted cedula.
 */
export function CoordinatorSelect({
  value,
  onChange,
  disabled = false,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: CoordinatorSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CoordinatorOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCoordinator, setSelectedCoordinator] =
    useState<CoordinatorOption | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load selected coordinator info on mount/value change
  useEffect(() => {
    if (!value) {
      setSelectedCoordinator(null);
      return;
    }

    const selectedId = value;
    async function loadSelected() {
      const supabase = createClient();
      const { data } = await supabase
        .from('miembros')
        .select('id, nombre, apellido, cedula')
        .eq('id', selectedId)
        .single();

      if (data) {
        setSelectedCoordinator({
          id: data.id,
          nombre: data.nombre,
          apellido: data.apellido,
          cedula: data.cedula,
        });
      }
    }

    loadSelected();
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      const supabase = createClient();
      const strippedTerm = term.replace(/\D/g, '');

      // Build query for coordinadores
      let query = supabase
        .from('miembros')
        .select('id, nombre, apellido, cedula')
        .eq('tipo_miembro', 'coordinador')
        .eq('estado', true)
        .order('nombre')
        .limit(10);

      // If term is numeric, search by cedula
      if (strippedTerm.length >= 2 && /^\d+$/.test(strippedTerm)) {
        query = query.ilike('cedula', `%${strippedTerm}%`);
      } else {
        // Search by name (combining nombre + apellido)
        query = query.or(
          `nombre.ilike.%${term}%,apellido.ilike.%${term}%`
        );
      }

      const { data } = await query;

      if (data) {
        setResults(
          data.map((d) => ({
            id: d.id,
            nombre: d.nombre,
            apellido: d.apellido,
            cedula: d.cedula,
          }))
        );
        setShowResults(true);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleInputChange(val: string) {
    setQuery(val);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      doSearch(val);
    }, 300);
  }

  function handleSelect(coordinator: CoordinatorOption) {
    setSelectedCoordinator(coordinator);
    onChange(coordinator.id);
    setShowResults(false);
    setQuery('');
    setResults([]);
  }

  function handleClear() {
    setSelectedCoordinator(null);
    onChange(null);
    setQuery('');
    setResults([]);
    setShowResults(false);
  }

  // If a coordinator is selected, show it as a "chip"
  if (selectedCoordinator && !showResults) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <UserCircle
          size={18}
          strokeWidth={1.5}
          className="flex-shrink-0 text-blue-600"
          aria-hidden="true"
        />
        <span className="flex-1 truncate">
          {selectedCoordinator.nombre} {selectedCoordinator.apellido}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatCedula(selectedCoordinator.cedula)}
        </span>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 flex-shrink-0"
            onClick={handleClear}
            aria-label="Quitar coordinador seleccionado"
          >
            <X size={12} strokeWidth={2} aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="search"
          placeholder="Buscar coordinador por nombre o cedula..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowResults(true);
          }}
          className="pl-9 pr-9"
          disabled={disabled}
          aria-label="Buscar coordinador"
          aria-expanded={showResults}
          aria-controls="coordinator-search-results"
          role="combobox"
          aria-autocomplete="list"
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        />
        {searching && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-label="Buscando coordinadores"
          />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div
          id="coordinator-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-surface shadow-lg"
        >
          {results.length === 0 && !searching ? (
            <p className="p-3 text-center text-sm text-placeholder">
              No se encontraron coordinadores
            </p>
          ) : (
            <ul className="py-1">
              {results.map((coord) => (
                <li key={coord.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
                    onClick={() => handleSelect(coord)}
                  >
                    <UserCircle
                      size={18}
                      strokeWidth={1.5}
                      className="flex-shrink-0 text-blue-600"
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate text-primary-text">
                      {coord.nombre} {coord.apellido}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatCedula(coord.cedula)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
