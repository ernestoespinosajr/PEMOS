'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MemberForm } from '@/components/members/member-form';
import type { Member, CreateMemberData } from '@/types/member';

/**
 * Edit Member page.
 *
 * Route: /miembros/[id]/editar
 *
 * Fetches the existing member data, then mounts the shared MemberForm
 * in edit mode. On successful submission, PATCHes to /api/members/[id]
 * and redirects back to the member detail page.
 */
export default function EditarMiembroPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMember() {
      setLoading(true);
      setFetchError(null);

      try {
        const res = await fetch(`/api/members/${memberId}`);
        const json = await res.json();

        if (!res.ok) {
          setFetchError(json.error ?? 'Error al cargar datos del miembro');
          return;
        }

        setMember(json.data);
      } catch {
        setFetchError('Error de conexion. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    }

    if (memberId) {
      fetchMember();
    }
  }, [memberId]);

  async function handleSubmit(data: CreateMemberData) {
    const res = await fetch(`/api/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? 'Error al actualizar miembro');
    }

    router.push(`/miembros/${memberId}`);
  }

  function handleCancel() {
    router.push(`/miembros/${memberId}`);
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
        <span className="ml-2 text-sm text-muted-foreground">
          Cargando datos del miembro...
        </span>
      </div>
    );
  }

  // Error state
  if (fetchError || !member) {
    return (
      <div>
        <div className="mb-space-6">
          <Link
            href={`/miembros/${memberId}`}
            className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Volver al Miembro
          </Link>
        </div>
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-6"
          role="alert"
        >
          <p className="text-sm text-destructive">
            {fetchError ?? 'No se pudo cargar el miembro.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-3"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6">
        <Link
          href={`/miembros/${memberId}`}
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver al Miembro
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Editar Miembro
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Modifica los datos de{' '}
          <span className="font-medium text-primary-text">
            {member.nombre} {member.apellido}
          </span>
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <MemberForm
          member={member}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Guardar Cambios"
        />
      </div>
    </div>
  );
}
