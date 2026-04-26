'use client';

import { Phone, MapPin, User } from 'lucide-react';
import type { FollowupQueueItem, PadronExternoRecord } from '@/types/seguimiento';

interface PadronInfoCardProps {
  /** Can accept a queue item or a padron record */
  data: Partial<FollowupQueueItem> & Partial<PadronExternoRecord>;
}

/**
 * Compact display of padron record data.
 * Used in queue items and follow-up form header.
 */
export function PadronInfoCard({ data }: PadronInfoCardProps) {
  const nombre = data.nombres ?? '';
  const apellido = data.apellidos ?? '';
  const cedula = data.cedula ?? '';
  const telefono = data.telefonos ?? '';
  const recinto = data.nombre_recinto ?? data.cod_recinto ?? '';
  const colegio = data.colegio ?? '';
  const direccion = data.direccion_recinto ?? '';

  // Format cedula for display: XXX-XXXXXXX-X
  const formatCedula = (c: string): string => {
    const digits = c.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
    }
    return c;
  };

  return (
    <div className="rounded-lg border bg-primary-tint/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User size={20} className="text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-primary-text">
            {nombre} {apellido}
          </p>
          <p className="text-sm text-secondary-text">
            Cedula: {formatCedula(cedula)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {telefono && (
          <div className="flex items-center gap-2 text-sm text-body-text">
            <Phone size={14} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{telefono}</span>
          </div>
        )}
        {recinto && (
          <div className="flex items-center gap-2 text-sm text-body-text">
            <MapPin size={14} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              {recinto}
              {colegio ? ` / Col. ${colegio}` : ''}
            </span>
          </div>
        )}
        {direccion && (
          <div className="col-span-full text-sm text-secondary-text">
            {direccion}
          </div>
        )}
      </div>
    </div>
  );
}
