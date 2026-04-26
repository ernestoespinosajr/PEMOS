'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ColegioList } from '@/components/electoral/colegio-list';
import { ColegioFormInline } from '@/components/electoral/colegio-form-inline';
import type { Recinto, Colegio } from '@/types/electoral';

export default function RecintoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recintoId = params.id as string;

  const [recinto, setRecinto] = useState<
    (Recinto & { municipio_nombre?: string; circunscripcion_nombre?: string }) | null
  >(null);
  const [colegios, setColegios] = useState<Colegio[]>([]);
  const [loading, setLoading] = useState(true);
  const [colegiosLoading, setColegiosLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch recinto details
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

  // Fetch colegios
  const fetchColegios = useCallback(async () => {
    setColegiosLoading(true);
    try {
      const res = await fetch(
        `/api/electoral/recintos/${recintoId}/colegios`
      );
      const json = await res.json();
      if (res.ok) {
        setColegios(json.data ?? []);
      }
    } catch (err) {
      console.error('Error fetching colegios:', err);
    } finally {
      setColegiosLoading(false);
    }
  }, [recintoId]);

  useEffect(() => {
    fetchColegios();
  }, [fetchColegios]);

  async function handleToggleColegioEstado(colegio: Colegio) {
    try {
      const res = await fetch(`/api/electoral/colegios/${colegio.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: !colegio.estado }),
      });
      if (res.ok) {
        fetchColegios();
      }
    } catch (err) {
      console.error('Error toggling colegio estado:', err);
    }
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
          href="/recintos"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Recintos
        </Link>

        <div className="flex flex-col gap-space-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-text">
              {recinto.nombre}
            </h2>
            <p className="mt-space-1 text-sm text-secondary-text">
              Codigo: {recinto.cod_recinto}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/recintos/${recintoId}/editar`)}
            className="sm:flex-shrink-0"
          >
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Editar Recinto
          </Button>
        </div>
      </div>

      {/* Recinto Info Card */}
      <Card className="mb-space-6 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Municipio
              </p>
              <p className="text-sm font-medium text-primary-text">
                {recinto.municipio_nombre ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Circunscripcion
              </p>
              <p className="text-sm font-medium text-primary-text">
                {recinto.circunscripcion_nombre ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Direccion
              </p>
              <p className="text-sm font-medium text-primary-text">
                {recinto.direccion ?? '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colegios Section */}
      <div className="mb-space-6">
        <div className="mb-space-3 flex items-center gap-2">
          <MapPin size={18} className="text-primary" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-primary-text">
            Colegios
          </h3>
          <Badge variant="outline">{colegios.length}</Badge>
        </div>

        <ColegioList
          colegios={colegios}
          loading={colegiosLoading}
          onToggleEstado={handleToggleColegioEstado}
        />

        {/* Inline add form */}
        <div className="mt-space-3 rounded-lg border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Agregar Colegio
          </p>
          <ColegioFormInline
            recintoId={recintoId}
            onCreated={fetchColegios}
          />
        </div>
      </div>
    </div>
  );
}
