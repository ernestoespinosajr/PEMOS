'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CandidatoForm } from '@/components/electoral/candidato-form';

function NuevoCandidatoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodoId = searchParams.get('periodo') ?? '';

  async function handleSubmit(data: {
    nombre: string;
    partido_id: string;
    orden: number;
    periodo_id: string;
    cargo_id?: string;
  }) {
    const res = await fetch('/api/electoral/candidatos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? 'Error al registrar candidato');
    }

    router.push('/candidatos');
  }

  function handleCancel() {
    router.push('/candidatos');
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
          Nuevo Candidato
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Registra un nuevo candidato para el periodo electoral.
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <CandidatoForm
          periodoId={periodoId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Registrar Candidato"
        />
      </div>
    </div>
  );
}

export default function NuevoCandidatoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-label="Cargando"
          />
        </div>
      }
    >
      <NuevoCandidatoContent />
    </Suspense>
  );
}
