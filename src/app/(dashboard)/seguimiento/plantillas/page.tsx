'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlantillaForm } from '@/components/seguimiento/plantilla-form';
import type { PlantillaLlamada } from '@/types/seguimiento';

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<PlantillaLlamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlantillaLlamada | undefined>(undefined);

  const fetchPlantillas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seguimiento/plantillas');
      const json = await res.json();

      if (res.ok) {
        setPlantillas(json.data ?? []);
      } else {
        console.error('Error fetching plantillas:', json.error);
        setPlantillas([]);
      }
    } catch (err) {
      console.error('Error fetching plantillas:', err);
      setPlantillas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlantillas();
  }, [fetchPlantillas]);

  function handleNew() {
    setEditing(undefined);
    setShowForm(true);
  }

  function handleEdit(plantilla: PlantillaLlamada) {
    setEditing(plantilla);
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    setEditing(undefined);
    fetchPlantillas();
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(undefined);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/seguimiento"
            className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Volver a Seguimiento
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Plantillas de Llamada
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Administrar guiones de llamada para el equipo de campo
          </p>
        </div>
        {!showForm && (
          <Button onClick={handleNew} className="sm:flex-shrink-0">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nueva Plantilla
          </Button>
        )}
      </div>

      {/* Form (create or edit) */}
      {showForm && (
        <div className="mb-space-6 rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="mb-space-4 text-lg font-semibold text-primary-text">
            {editing ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h3>
          <PlantillaForm
            plantilla={editing}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-label="Cargando plantillas"
          />
        </div>
      )}

      {/* Plantillas List */}
      {!loading && plantillas.length > 0 && (
        <div className="space-y-3">
          {plantillas.map((plantilla) => (
            <div
              key={plantilla.id}
              className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50">
                    <FileText
                      size={20}
                      strokeWidth={1.5}
                      className="text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-primary-text">
                        {plantilla.nombre}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          plantilla.activa
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {plantilla.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-secondary-text line-clamp-2">
                      {plantilla.contenido}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Actualizada:{' '}
                      {new Date(plantilla.updated_at).toLocaleDateString('es-DO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(plantilla)}
                  className="flex-shrink-0"
                >
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && plantillas.length === 0 && !showForm && (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-border bg-surface">
          <FileText
            size={32}
            strokeWidth={1.5}
            className="mb-2 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm text-placeholder">
            No hay plantillas de llamada configuradas.
          </p>
          <Button onClick={handleNew} variant="outline" size="sm" className="mt-3">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Crear primera plantilla
          </Button>
        </div>
      )}
    </div>
  );
}
