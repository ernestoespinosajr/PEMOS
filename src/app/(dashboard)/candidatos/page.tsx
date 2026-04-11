'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PeriodoSelector } from '@/components/electoral/periodo-selector';
import { CandidatoTable } from '@/components/electoral/candidato-table';
import type { CandidatoListItem } from '@/types/electoral';

// ---------- Main Content ----------

function CandidatosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [periodoId, setPeriodoId] = useState(searchParams.get('periodo') ?? '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [candidatos, setCandidatos] = useState<CandidatoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCandidatos = useCallback(async () => {
    if (!periodoId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('periodo_id', periodoId);
      if (search) params.set('search', search);

      const res = await fetch(`/api/electoral/candidatos?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setCandidatos(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      } else {
        console.error('Error fetching candidatos:', json.error);
        setCandidatos([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Error fetching candidatos:', err);
      setCandidatos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [periodoId, search]);

  useEffect(() => {
    fetchCandidatos();
  }, [fetchCandidatos]);

  function handlePeriodoChange(id: string) {
    setPeriodoId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set('periodo', id);
    router.push(`/candidatos?${params.toString()}`, { scroll: false });
  }

  function handleSearch(value: string) {
    setSearch(value);
  }

  function handleEdit(candidato: CandidatoListItem) {
    router.push(`/candidatos/${candidato.id}/editar`);
  }

  async function handleToggleEstado(candidato: CandidatoListItem) {
    try {
      const res = await fetch(`/api/electoral/candidatos/${candidato.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: !candidato.estado }),
      });

      if (res.ok) {
        fetchCandidatos();
      }
    } catch (err) {
      console.error('Error toggling candidato estado:', err);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Candidatos
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Registro y gestion de candidatos por periodo electoral
          </p>
        </div>
        <Button asChild className="sm:flex-shrink-0">
          <Link href={`/candidatos/nuevo${periodoId ? `?periodo=${periodoId}` : ''}`}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo Candidato
          </Link>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="mb-space-4 flex flex-col gap-space-3 sm:flex-row sm:items-end">
        <PeriodoSelector
          value={periodoId}
          onChange={handlePeriodoChange}
          autoSelectActive
          className="sm:w-72"
        />
        <div className="relative sm:w-64">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar candidato..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar candidatos"
          />
        </div>
      </div>

      {/* Results count */}
      {!loading && total > 0 && (
        <div className="mb-space-3">
          <span className="text-sm text-muted-foreground">
            {total} candidato{total !== 1 ? 's' : ''} encontrado
            {total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Candidato Table */}
      <CandidatoTable
        candidatos={candidatos}
        loading={loading}
        onEdit={handleEdit}
        onToggleEstado={handleToggleEstado}
      />
    </div>
  );
}

// ---------- Page Export ----------

export default function CandidatosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-label="Cargando candidatos"
          />
        </div>
      }
    >
      <CandidatosContent />
    </Suspense>
  );
}
