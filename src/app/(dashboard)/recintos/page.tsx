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
import { RecintoTable } from '@/components/electoral/recinto-table';
import type { RecintoListItem } from '@/types/electoral';

// ---------- Main Content ----------

function RecintosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [recintos, setRecintos] = useState<RecintoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRecintos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/electoral/recintos?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setRecintos(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      } else {
        console.error('Error fetching recintos:', json.error);
        setRecintos([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Error fetching recintos:', err);
      setRecintos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchRecintos();
  }, [fetchRecintos]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Recintos
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Gestion de recintos y centros de votacion
          </p>
        </div>
        <Button asChild className="sm:flex-shrink-0">
          <Link href="/recintos/nuevo">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo Recinto
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="mb-space-4">
        <div className="relative max-w-sm">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar por nombre o codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar recintos"
          />
        </div>
      </div>

      {/* Results count */}
      {!loading && total > 0 && (
        <div className="mb-space-3">
          <span className="text-sm text-muted-foreground">
            {total} recinto{total !== 1 ? 's' : ''} encontrado
            {total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Recinto Table */}
      <RecintoTable recintos={recintos} loading={loading} />
    </div>
  );
}

// ---------- Page Export ----------

export default function RecintosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-label="Cargando recintos"
          />
        </div>
      }
    >
      <RecintosContent />
    </Suspense>
  );
}
