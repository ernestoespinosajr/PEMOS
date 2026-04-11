'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { RecintoForm } from '@/components/electoral/recinto-form';

export default function NuevoRecintoPage() {
  const router = useRouter();

  async function handleSubmit(data: {
    cod_recinto: string;
    nombre: string;
    direccion?: string;
    municipio_id: string;
    circunscripcion_id?: string;
  }) {
    const res = await fetch('/api/electoral/recintos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? 'Error al crear recinto');
    }

    // Navigate to the new recinto's detail page
    if (json.data?.id) {
      router.push(`/recintos/${json.data.id}`);
    } else {
      router.push('/recintos');
    }
  }

  function handleCancel() {
    router.push('/recintos');
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6">
        <Link
          href="/recintos"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Recintos
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Nuevo Recinto
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Registra un nuevo recinto electoral.
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <RecintoForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Crear Recinto"
        />
      </div>
    </div>
  );
}
