'use client';

import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';

interface ConversionFormProps {
  /** The seguimiento record ID to convert */
  seguimientoId: string;
  /** Pre-populated data from padron/seguimiento */
  cedula: string;
  nombre: string;
  apellido: string;
  /** Called after successful conversion */
  onConverted: (miembroId: string) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/**
 * "Convert to member" dialog form.
 * Pre-populated with data from padron_externo + seguimiento,
 * allows user to select tipo_miembro and submit.
 */
export function ConversionForm({
  seguimientoId,
  cedula,
  nombre,
  apellido,
  onConverted,
  onCancel,
}: ConversionFormProps) {
  const [tipoMiembro, setTipoMiembro] = useState('relacionado');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format cedula for display
  const formatCedula = (c: string): string => {
    const digits = c.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
    }
    return c;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/seguimiento/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seguimiento_id: seguimientoId,
          tipo_miembro: tipoMiembro,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al convertir a miembro');
        return;
      }

      onConverted(json.data.miembro_id);
    } catch {
      setError('Error de conexion');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2">
        <UserPlus size={20} className="text-primary" aria-hidden="true" />
        <h3 className="text-base font-semibold text-primary-text">
          Convertir a Miembro
        </h3>
      </div>

      {error && (
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Read-only summary */}
      <div className="rounded-lg border bg-neutral-50 p-3">
        <p className="text-sm">
          <span className="text-muted-foreground">Cedula:</span>{' '}
          <strong>{formatCedula(cedula)}</strong>
        </p>
        <p className="mt-1 text-sm">
          <span className="text-muted-foreground">Nombre:</span>{' '}
          <strong>
            {nombre} {apellido}
          </strong>
        </p>
      </div>

      {/* Tipo Miembro selection */}
      <div>
        <Label
          htmlFor="tipo_miembro"
          className="mb-1.5 block text-sm font-medium"
        >
          Tipo de Miembro <span className="text-destructive">*</span>
        </Label>
        <SelectNative
          id="tipo_miembro"
          value={tipoMiembro}
          onChange={(e) => setTipoMiembro(e.target.value)}
        >
          <option value="coordinador">Coordinador</option>
          <option value="multiplicador">Multiplicador</option>
          <option value="relacionado">Relacionado</option>
        </SelectNative>
      </div>

      {/* Info callout */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          Se creara un nuevo miembro con los datos del padron externo y el
          registro de seguimiento. Podra editar los datos completos despues de
          la conversion.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting && (
            <Loader2
              className="mr-2 h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          )}
          Convertir a Miembro
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
