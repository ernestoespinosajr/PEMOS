'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PeriodoSelector } from '@/components/electoral/periodo-selector';
import { ActaTable } from '@/components/electoral/acta-table';
import type { ActaListItem } from '@/types/electoral';

export default function ActasPage() {
  const [periodoId, setPeriodoId] = useState('');
  const [actas, setActas] = useState<ActaListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActas = useCallback(async () => {
    if (!periodoId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('periodo_id', periodoId);

      const res = await fetch(`/api/electoral/actas?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setActas(json.data ?? []);
      } else {
        console.error('Error fetching actas:', json.error);
        setActas([]);
      }
    } catch (err) {
      console.error('Error fetching actas:', err);
      setActas([]);
    } finally {
      setLoading(false);
    }
  }, [periodoId]);

  useEffect(() => {
    fetchActas();
  }, [fetchActas]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6">
        <Link
          href="/monitoreo"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Monitoreo
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Actas Electorales
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Historial de actas registradas por periodo electoral
        </p>
      </div>

      {/* Periodo Selector */}
      <div className="mb-space-4">
        <PeriodoSelector
          value={periodoId}
          onChange={setPeriodoId}
          autoSelectActive
          className="max-w-sm"
        />
      </div>

      {/* Results count */}
      {!loading && actas.length > 0 && (
        <div className="mb-space-3">
          <span className="text-sm text-muted-foreground">
            {actas.length} acta{actas.length !== 1 ? 's' : ''} registrada
            {actas.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Actas Table */}
      <ActaTable actas={actas} loading={loading} />
    </div>
  );
}
