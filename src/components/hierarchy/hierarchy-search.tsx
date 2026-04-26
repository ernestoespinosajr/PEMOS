'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { HierarchyLevel } from '@/types/hierarchy';
import { HIERARCHY_ORDER, LEVEL_LABELS, LEVEL_TABLE } from '@/types/hierarchy';

// ---------- Badge colors per level ----------

const LEVEL_BADGE_COLORS: Record<HierarchyLevel, string> = {
  provincia: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  municipio: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  circunscripcion: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  sector: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  comite: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  nivel_intermedio: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-100',
};

interface SearchResult {
  id: string;
  nombre: string;
  level: HierarchyLevel;
}

interface HierarchySearchProps {
  /** Called when the user selects a search result to navigate to it. */
  onSelect: (level: HierarchyLevel, id: string) => void;
  className?: string;
}

/**
 * Search component for the hierarchy page.
 *
 * Searches across all 6 hierarchy levels and displays results
 * in a dropdown. Clicking a result fires onSelect which triggers
 * navigation to that entity in the table.
 */
export function HierarchySearch({
  onSelect,
  className,
}: HierarchySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);

    try {
      const supabase = createClient();
      const allResults: SearchResult[] = [];

      // Search each table in parallel
      const queries = HIERARCHY_ORDER.map(async (level) => {
        const table = LEVEL_TABLE[level];
        const { data } = await supabase
          .from(table)
          .select('id, nombre')
          .ilike('nombre', `%${term}%`)
          .eq('estado', true)
          .order('nombre')
          .limit(5);

        if (data) {
          return data.map((row) => ({
            id: row.id as string,
            nombre: row.nombre as string,
            level,
          }));
        }
        return [];
      });

      const resultsArrays = await Promise.all(queries);
      for (const arr of resultsArrays) {
        allResults.push(...arr);
      }

      setResults(allResults);
      setShowResults(allResults.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      doSearch(value);
    }, 300);
  }

  function handleSelect(result: SearchResult) {
    setShowResults(false);
    setQuery('');
    setResults([]);
    onSelect(result.level, result.id);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setShowResults(false);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Buscar en toda la jerarquia..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowResults(true);
          }}
          className="pl-9 pr-9"
          aria-label="Buscar entidades en la jerarquia"
          aria-expanded={showResults}
          aria-controls="hierarchy-search-results"
          role="combobox"
          aria-autocomplete="list"
        />
        {searching && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-label="Buscando"
          />
        )}
        {!searching && query.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={handleClear}
            aria-label="Limpiar busqueda"
          >
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div
          id="hierarchy-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-surface shadow-lg"
        >
          {results.length === 0 && !searching ? (
            <p className="p-3 text-center text-sm text-placeholder">
              No se encontraron resultados
            </p>
          ) : (
            <ul className="py-1">
              {results.map((result) => (
                <li key={`${result.level}-${result.id}`}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
                    onClick={() => handleSelect(result)}
                  >
                    <Badge
                      className={cn(
                        'text-[10px] font-medium border-0',
                        LEVEL_BADGE_COLORS[result.level]
                      )}
                    >
                      {LEVEL_LABELS[result.level].singular}
                    </Badge>
                    <span className="truncate text-primary-text">
                      {result.nombre}
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

export { LEVEL_BADGE_COLORS };
