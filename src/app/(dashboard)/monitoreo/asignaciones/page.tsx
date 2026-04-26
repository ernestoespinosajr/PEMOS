'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PeriodoSelector } from '@/components/electoral/periodo-selector';
import { AsignacionForm } from '@/components/electoral/asignacion-form';
import { AsignacionTable } from '@/components/electoral/asignacion-table';
import type { AsignacionListItem } from '@/types/electoral';

export default function AsignacionesPage() {
  const [periodoId, setPeriodoId] = useState('');
  const [asignaciones, setAsignaciones] = useState<AsignacionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAsignaciones = useCallback(async () => {
    if (!periodoId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('periodo_id', periodoId);

      const res = await fetch(`/api/electoral/asignaciones?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setAsignaciones(json.data ?? []);
      } else {
        console.error('Error fetching asignaciones:', json.error);
        setAsignaciones([]);
      }
    } catch (err) {
      console.error('Error fetching asignaciones:', err);
      setAsignaciones([]);
    } finally {
      setLoading(false);
    }
  }, [periodoId]);

  useEffect(() => {
    fetchAsignaciones();
  }, [fetchAsignaciones]);

  async function handleDelete(asignacion: AsignacionListItem) {
    if (
      !confirm(
        `Eliminar asignacion de ${asignacion.usuario_nombre ?? 'este observador'} al recinto ${asignacion.recinto_nombre ?? ''}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/electoral/asignaciones/${asignacion.id}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        fetchAsignaciones();
      }
    } catch (err) {
      console.error('Error deleting asignacion:', err);
    }
  }

  function handleCreated() {
    setShowForm(false);
    fetchAsignaciones();
  }

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

        <div className="flex flex-col gap-space-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-text">
              Asignacion de Observadores
            </h2>
            <p className="mt-space-1 text-sm text-secondary-text">
              Asigna observadores a recintos y colegios electorales
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="sm:flex-shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Asignar Observador
          </Button>
        </div>
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

      {/* Assignment Form */}
      {showForm && periodoId && (
        <div className="mb-space-6 rounded-xl border bg-card p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-primary-text">
            Nueva Asignacion
          </h3>
          <AsignacionForm
            periodoId={periodoId}
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Results count */}
      {!loading && asignaciones.length > 0 && (
        <div className="mb-space-3">
          <span className="text-sm text-muted-foreground">
            {asignaciones.length} asignacion
            {asignaciones.length !== 1 ? 'es' : ''} registrada
            {asignaciones.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Asignaciones Table */}
      <AsignacionTable
        asignaciones={asignaciones}
        loading={loading}
        onDelete={handleDelete}
      />
    </div>
  );
}
