'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CandidatoForm } from '@/components/electoral/candidato-form';
import type { Candidato } from '@/types/electoral';

export default function EditarCandidatoPage() {
  const router = useRouter();
  const params = useParams();
  const candidatoId = params.id as string;

  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCandidato() {
      setLoading(true);
      try {
        const res = await fetch(`/api/electoral/candidatos/${candidatoId}`);
        const json = await res.json();

        if (!res.ok) {
          setFetchError(json.error ?? 'Candidato no encontrado');
          return;
        }

        setCandidato(json.data);
      } catch {
        setFetchError('Error de conexion');
      } finally {
        setLoading(false);
      }
    }

    fetchCandidato();
  }, [candidatoId]);

  async function handleSubmit(data: {
    nombre: string;
    partido_id: string;
    orden: number;
    periodo_id: string;
    cargo_id?: string;
  }) {
    const res = await fetch(`/api/electoral/candidatos/${candidatoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? 'Error al actualizar candidato');
    }

    router.push('/candidatos');
  }

  function handleCancel() {
    router.push('/candidatos');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando candidato"
        />
      </div>
    );
  }

  if (fetchError || !candidato) {
    return (
      <div>
        <Link
          href="/candidatos"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Candidatos
        </Link>
        <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {fetchError ?? 'Candidato no encontrado'}
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
          href="/candidatos"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Candidatos
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Editar Candidato
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Modifica los datos del candidato {candidato.nombre}.
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <CandidatoForm
          candidato={candidato}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Guardar Cambios"
        />
      </div>
    </div>
  );
}
