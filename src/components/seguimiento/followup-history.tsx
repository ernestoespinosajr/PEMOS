'use client';

import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { EstadoBadge } from './estado-badge';
import { CONTACTO_OPTIONS } from '@/types/seguimiento';
import type { SeguimientoHistorialRecord } from '@/types/seguimiento';

interface FollowupHistoryProps {
  /** The seguimiento record ID */
  seguimientoId: string;
}

/**
 * Chronological timeline of follow-up contact attempts for one individual.
 * Fetches history from the API and displays date, outcome, estado transition,
 * comentario, and user who recorded.
 */
export function FollowupHistory({ seguimientoId }: FollowupHistoryProps) {
  const [entries, setEntries] = useState<SeguimientoHistorialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/seguimiento/${seguimientoId}/historial`
        );
        const json = await res.json();
        if (res.ok) {
          setEntries(json.data ?? []);
        }
      } catch (err) {
        console.error('Error fetching historial:', err);
      } finally {
        setLoading(false);
      }
    }

    if (seguimientoId) {
      fetchHistory();
    }
  }, [seguimientoId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Cargando historial...
        </span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface py-6 text-center">
        <Clock
          size={24}
          className="mx-auto mb-2 text-placeholder"
          aria-hidden="true"
        />
        <p className="text-sm text-placeholder">
          No hay registros de historial para este seguimiento.
        </p>
      </div>
    );
  }

  const contactoLabel = (value: string | null): string => {
    if (!value) return '-';
    const opt = CONTACTO_OPTIONS.find((o) => o.value === value);
    return opt ? opt.label : value;
  };

  return (
    <div className="space-y-0">
      {entries.map((entry, index) => (
        <div key={entry.id} className="relative flex gap-3">
          {/* Timeline connector */}
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-white">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            {index < entries.length - 1 && (
              <div className="w-px flex-1 bg-border" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            {/* Date and user */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-primary-text">
                {new Date(entry.created_at).toLocaleDateString('es-DO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {(entry.usuario_nombre || entry.usuario_apellido) && (
                <span className="text-xs text-muted-foreground">
                  por {entry.usuario_nombre} {entry.usuario_apellido}
                </span>
              )}
            </div>

            {/* Estado transition */}
            {(entry.estado_anterior || entry.estado_nuevo) && (
              <div className="mt-1 flex items-center gap-1.5">
                {entry.estado_anterior && (
                  <EstadoBadge estado={entry.estado_anterior} />
                )}
                {entry.estado_anterior && entry.estado_nuevo && (
                  <span className="text-xs text-muted-foreground">&rarr;</span>
                )}
                {entry.estado_nuevo && (
                  <EstadoBadge estado={entry.estado_nuevo} />
                )}
              </div>
            )}

            {/* Contact result */}
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-body-text">
              <span>
                Contacto: <strong>{contactoLabel(entry.contacto)}</strong>
              </span>
              {entry.decision_voto && (
                <span>
                  Voto: <strong>{entry.decision_voto}</strong>
                </span>
              )}
              {entry.decision_presidente && (
                <span>
                  Presidente: <strong>{entry.decision_presidente}</strong>
                </span>
              )}
            </div>

            {/* Comment */}
            {entry.comentario && (
              <p className="mt-1 text-xs text-secondary-text">
                {entry.comentario}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
