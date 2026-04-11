'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PadronInfoCard } from '@/components/seguimiento/padron-info-card';
import { CallScriptDisplay } from '@/components/seguimiento/call-script-display';
import { FollowupForm } from '@/components/seguimiento/followup-form';
import { FollowupHistory } from '@/components/seguimiento/followup-history';
import { ConversionForm } from '@/components/seguimiento/conversion-form';
import { EstadoBadge } from '@/components/seguimiento/estado-badge';
import { Button } from '@/components/ui/button';
import type { FollowupQueueItem, SeguimientoRecord } from '@/types/seguimiento';
import type { PadronExternoRecord } from '@/types/seguimiento';

interface PageProps {
  params: Promise<{ cedula: string }>;
}

export default function SeguimientoCedulaPage({ params }: PageProps) {
  const { cedula } = use(params);
  const [padron, setPadron] = useState<PadronExternoRecord | null>(null);
  const [seguimiento, setSeguimiento] = useState<SeguimientoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConversion, setShowConversion] = useState(false);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch seguimiento records by cedula
        const segRes = await fetch(
          `/api/seguimiento?cedula=${encodeURIComponent(cedula)}&page_size=1`
        );
        const segJson = await segRes.json();

        if (segRes.ok && segJson.data && segJson.data.length > 0) {
          const seg = segJson.data[0] as SeguimientoRecord;
          setSeguimiento(seg);

          // Fetch padron + full seguimiento data via [id] endpoint
          const detailRes = await fetch(`/api/seguimiento/${seg.id}`);
          const detailJson = await detailRes.json();
          if (detailRes.ok && detailJson.padron) {
            setPadron(detailJson.padron as PadronExternoRecord);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (cedula) {
      fetchData();
    }
  }, [cedula]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Cargando" />
      </div>
    );
  }

  // Build a queue-compatible item for the form/script components
  const queueItem: FollowupQueueItem = {
    padron_id: padron?.id ?? '',
    cedula,
    nombres: padron?.nombres ?? '',
    apellidos: padron?.apellidos ?? '',
    telefonos: padron?.telefonos ?? '',
    colegio: padron?.colegio ?? seguimiento?.colegio ?? null,
    cod_recinto: padron?.cod_recinto ?? seguimiento?.cod_recinto ?? null,
    nombre_recinto: padron?.nombre_recinto ?? null,
    direccion_recinto: padron?.direccion_recinto ?? null,
    seguimiento_id: seguimiento?.id ?? null,
    estado: (seguimiento?.estado ?? 'no_contactado') as FollowupQueueItem['estado'],
    contacto: seguimiento?.contacto ?? null,
    decision_voto: seguimiento?.decision_voto ?? null,
    decision_presidente: seguimiento?.decision_presidente ?? null,
    comentario: seguimiento?.comentario ?? null,
    fecha_proximo_seguimiento: seguimiento?.fecha_proximo_seguimiento ?? null,
    recinto_id: seguimiento?.recinto_id ?? null,
    es_vencido: false,
    total_count: 0,
  };

  function handleSubmitted() {
    setShowForm(false);
    // Reload the page data
    window.location.reload();
  }

  function handleConverted(_miembroId: string) {
    setShowConversion(false);
    window.location.reload();
  }

  return (
    <div>
      <div className="mb-space-6">
        <Link
          href="/seguimiento/cola"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a la Cola
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Seguimiento Individual
        </h2>
      </div>

      <div className="space-y-6">
        {/* Person info */}
        <PadronInfoCard data={{ ...padron, ...queueItem }} />

        {/* Current status */}
        {seguimiento && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Estado actual:</span>
            <EstadoBadge estado={seguimiento.estado} />
          </div>
        )}

        {/* Call script */}
        <CallScriptDisplay item={queueItem} />

        {/* Conversion form */}
        {showConversion && seguimiento ? (
          <div className="rounded-lg border p-4">
            <ConversionForm
              seguimientoId={seguimiento.id}
              cedula={cedula}
              nombre={padron?.nombres ?? ''}
              apellido={padron?.apellidos ?? ''}
              onConverted={handleConverted}
              onCancel={() => setShowConversion(false)}
            />
          </div>
        ) : showForm ? (
          <>
            {/* Follow-up form */}
            <div className="rounded-lg border p-4">
              <h3 className="mb-4 text-sm font-semibold text-primary-text">
                Registrar Seguimiento
              </h3>
              <FollowupForm
                item={queueItem}
                onSubmitted={handleSubmitted}
                onCancel={() => setShowForm(false)}
              />
            </div>

            {/* Convert to member button */}
            {seguimiento && seguimiento.estado === 'contactado' && (
              <Button
                variant="outline"
                onClick={() => setShowConversion(true)}
                className="w-full sm:w-auto"
              >
                Convertir a Miembro
              </Button>
            )}
          </>
        ) : (
          <Button onClick={() => setShowForm(true)} variant="outline">
            Nuevo Seguimiento
          </Button>
        )}

        {/* History */}
        {seguimiento && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-primary-text">
              Historial de Contacto
            </h3>
            <FollowupHistory seguimientoId={seguimiento.id} />
          </div>
        )}
      </div>
    </div>
  );
}
