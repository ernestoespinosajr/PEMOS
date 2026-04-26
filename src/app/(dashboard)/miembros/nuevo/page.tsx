'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { MemberForm } from '@/components/members/member-form';
import type { CreateMemberData } from '@/types/member';

/**
 * Registrar Nuevo Miembro page.
 *
 * Route: /miembros/nuevo
 *
 * Mounts the shared MemberForm component in create mode.
 * On successful submission, POSTs to /api/members and redirects
 * to the new member's detail page.
 */
export default function NuevoMiembroPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(data: CreateMemberData) {
    setSubmitError(null);

    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? 'Error al registrar miembro');
    }

    // Redirect to the newly created member's detail page
    if (json.data?.id) {
      router.push(`/miembros/${json.data.id}`);
    } else {
      router.push('/miembros');
    }
  }

  function handleCancel() {
    router.push('/miembros');
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6">
        <Link
          href="/miembros"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Miembros
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Registrar Nuevo Miembro
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Completa los datos para registrar un nuevo miembro en el sistema.
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <MemberForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Registrar Miembro"
        />
      </div>
    </div>
  );
}
