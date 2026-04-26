'use client';

import { Loader2, Phone, AlertTriangle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EstadoBadge } from './estado-badge';
import type { FollowupQueueItem } from '@/types/seguimiento';

interface FollowupQueueProps {
  items: FollowupQueueItem[];
  loading: boolean;
  onSelect: (item: FollowupQueueItem) => void;
}

/**
 * Follow-up queue list component.
 * Displays pending follow-ups sorted by priority (overdue first).
 * Mobile-optimized: card layout on small screens.
 */
export function FollowupQueue({ items, loading, onSelect }: FollowupQueueProps) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label="Cargando cola de seguimiento"
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface">
        <div className="text-center">
          <Phone
            size={32}
            className="mx-auto mb-2 text-placeholder"
            aria-hidden="true"
          />
          <p className="text-sm text-placeholder">
            No hay seguimientos pendientes en su cola.
          </p>
        </div>
      </div>
    );
  }

  // Format cedula for display
  const formatCedula = (c: string): string => {
    const digits = c.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
    }
    return c;
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.padron_id}
          onClick={() => onSelect(item)}
          className="group w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Name and overdue indicator */}
              <div className="flex items-center gap-2">
                {item.es_vencido && (
                  <AlertTriangle
                    size={16}
                    className="flex-shrink-0 text-amber-500"
                    aria-label="Seguimiento vencido"
                  />
                )}
                <p className="truncate text-sm font-semibold text-primary-text">
                  {item.nombres} {item.apellidos}
                </p>
              </div>

              {/* Cedula and phone */}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-xs text-secondary-text">
                  {formatCedula(item.cedula)}
                </span>
                {item.telefonos && (
                  <span className="flex items-center gap-1 text-xs text-secondary-text">
                    <Phone size={12} aria-hidden="true" />
                    {item.telefonos}
                  </span>
                )}
              </div>

              {/* Recinto */}
              {item.nombre_recinto && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.cod_recinto} - {item.nombre_recinto}
                  {item.colegio ? ` / Col. ${item.colegio}` : ''}
                </p>
              )}

              {/* Status and scheduled date */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <EstadoBadge estado={item.estado} />
                {item.fecha_proximo_seguimiento && (
                  <Badge
                    variant="outline"
                    className={
                      item.es_vencido
                        ? 'border-amber-300 text-amber-700'
                        : 'text-xs'
                    }
                  >
                    {item.es_vencido ? 'Vencido: ' : 'Programado: '}
                    {new Date(item.fecha_proximo_seguimiento + 'T00:00:00').toLocaleDateString(
                      'es-DO',
                      { day: '2-digit', month: 'short' }
                    )}
                  </Badge>
                )}
              </div>
            </div>

            <ChevronRight
              size={20}
              className="flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </button>
      ))}
    </div>
  );
}
