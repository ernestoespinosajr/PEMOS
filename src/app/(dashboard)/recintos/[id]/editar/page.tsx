'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { RecintoForm } from '@/components/electoral/recinto-form';
import type { Recinto } from '@/types/electoral';

export default function EditarRecintoPage() {
  const router = useRouter();
  const params = useParams();
  const recintoId = params.id as string;

  const [recinto, setRecinto] = useState<Recinto | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecinto() {
      setLoading(true);
      try {
        const res = await fetch(`/api/electoral/recintos/${recintoId}`);
        const json = await res.json();
        if (!res.ok) {
          setFetchError(json.error ?? 'Recinto no encontrado');
          return;
        }
        setRecinto(json.data);
      } catch {
        setFetchError('Error de conexion');
      } finally {
        setLoading(false);
      }
    }
    fetchRecinto();
  }, [recintoId]);

  async function handleSubmit(data: {
    cod_recinto: string;
    nombre: string;
    direccion?: string;
    municipio_id: string;
    circunscripcion_id?: string;
  }) {
    const res = await fetch(`/api/electoral/recintos/${recintoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? 'Error al actualizar recinto');
    }

    router.push(`/recintos/${recintoId}`);
  }

  function handleCancel() {
    router.push(`/recintos/${recintoId}`);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando recinto"
        />
      </div>
    );
  }

  if (fetchError || !recinto) {
    return (
      <div>
        <Link
          href="/recintos"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Recintos
        </Link>
        <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {fetchError ?? 'Recinto no encontrado'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6">
        <Link
          href={`/recintos/${recintoId}`}
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver al Recinto
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Editar Recinto
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Modifica los datos del recinto {recinto.nombre}.
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <RecintoForm
          recinto={recinto}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Guardar Cambios"
        />
      </div>
    </div>
  );
}
