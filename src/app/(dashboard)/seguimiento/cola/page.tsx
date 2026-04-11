'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FollowupQueue } from '@/components/seguimiento/followup-queue';
import { FollowupForm } from '@/components/seguimiento/followup-form';
import { CallScriptDisplay } from '@/components/seguimiento/call-script-display';
import { PadronInfoCard } from '@/components/seguimiento/padron-info-card';
import { FollowupHistory } from '@/components/seguimiento/followup-history';
import { ConversionForm } from '@/components/seguimiento/conversion-form';
import { Button } from '@/components/ui/button';
import type { FollowupQueueItem } from '@/types/seguimiento';

export default function SeguimientoColaPage() {
  const [items, setItems] = useState<FollowupQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FollowupQueueItem | null>(null);
  const [showConversion, setShowConversion] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seguimiento/queue?limit=50');
      const json = await res.json();
      if (res.ok) {
        setItems(json.data ?? []);
      } else {
        console.error('Error fetching queue:', json.error);
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  function handleSelect(item: FollowupQueueItem) {
    setSelectedItem(item);
    setShowConversion(false);
  }

  function handleBack() {
    setSelectedItem(null);
    setShowConversion(false);
  }

  function handleSubmitted() {
    setSelectedItem(null);
    setShowConversion(false);
    // Refresh the queue
    fetchQueue();
  }

  function handleConverted(_miembroId: string) {
    setSelectedItem(null);
    setShowConversion(false);
    fetchQueue();
  }

  // If an individual is selected, show their follow-up detail view
  if (selectedItem) {
    return (
      <div>
        <div className="mb-space-6">
          <button
            onClick={handleBack}
            className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Volver a la Cola
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Seguimiento
          </h2>
        </div>

        <div className="space-y-6">
          {/* Person info */}
          <PadronInfoCard data={selectedItem} />

          {/* Call script */}
          <CallScriptDisplay item={selectedItem} />

          {/* Conversion form (if applicable) */}
          {showConversion && selectedItem.seguimiento_id ? (
            <div className="rounded-lg border p-4">
              <ConversionForm
                seguimientoId={selectedItem.seguimiento_id}
                cedula={selectedItem.cedula}
                nombre={selectedItem.nombres ?? ''}
                apellido={selectedItem.apellidos ?? ''}
                onConverted={handleConverted}
                onCancel={() => setShowConversion(false)}
              />
            </div>
          ) : (
            <>
              {/* Follow-up form */}
              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-sm font-semibold text-primary-text">
                  Registrar Seguimiento
                </h3>
                <FollowupForm
                  item={selectedItem}
                  onSubmitted={handleSubmitted}
                  onCancel={handleBack}
                />
              </div>

              {/* Convert to member button (only for contactado items) */}
              {selectedItem.seguimiento_id &&
                selectedItem.estado === 'contactado' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowConversion(true)}
                    className="w-full sm:w-auto"
                  >
                    Convertir a Miembro
                  </Button>
                )}
            </>
          )}

          {/* History (if existing seguimiento record) */}
          {selectedItem.seguimiento_id && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-primary-text">
                Historial de Contacto
              </h3>
              <FollowupHistory seguimientoId={selectedItem.seguimiento_id} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Queue list view
  return (
    <div>
      <div className="mb-space-6">
        <Link
          href="/seguimiento"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Seguimiento
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Cola de Seguimiento
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Personas pendientes de contacto en sus recintos asignados
        </p>
      </div>

      <FollowupQueue items={items} loading={loading} onSelect={handleSelect} />

      {!loading && items.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Mostrando {items.length} de{' '}
          {items[0]?.total_count ?? items.length} registros
        </p>
      )}
    </div>
  );
}
