'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { CONTACTO_OPTIONS, DECISION_OPTIONS } from '@/types/seguimiento';
import type { FollowupQueueItem } from '@/types/seguimiento';

interface FollowupFormProps {
  /** The individual being followed up */
  item: FollowupQueueItem;
  /** Called after successful submission */
  onSubmitted: () => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/**
 * Follow-up recording form.
 * Mobile-first layout with large touch targets and minimal fields.
 * Captures: contacto, decision_voto, decision_presidente, comentario,
 * and fecha_proximo_seguimiento.
 */
export function FollowupForm({ item, onSubmitted, onCancel }: FollowupFormProps) {
  const [contacto, setContacto] = useState('');
  const [decisionVoto, setDecisionVoto] = useState('');
  const [decisionPresidente, setDecisionPresidente] = useState('');
  const [comentario, setComentario] = useState('');
  const [fechaProximo, setFechaProximo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!contacto) {
      setError('Debe indicar si se logro el contacto (SI/NO)');
      setSubmitting(false);
      return;
    }

    // Determine state based on outcome
    let estado = 'no_contactado';
    if (contacto === 'SI') {
      estado = 'contactado';
    } else if (fechaProximo) {
      estado = 'seguimiento_programado';
    }

    const payload: Record<string, unknown> = {
      cedula: item.cedula,
      colegio: item.colegio || undefined,
      recinto_id: item.recinto_id || undefined,
      cod_recinto: item.cod_recinto || undefined,
      contacto,
      estado,
    };

    if (decisionVoto) payload.decision_voto = decisionVoto;
    if (decisionPresidente) payload.decision_presidente = decisionPresidente;
    if (comentario.trim()) payload.comentario = comentario.trim();
    if (fechaProximo) payload.fecha_proximo_seguimiento = fechaProximo;

    try {
      // If there's an existing seguimiento record, PATCH it; otherwise POST new
      const isUpdate = !!item.seguimiento_id;
      const url = isUpdate
        ? `/api/seguimiento/${item.seguimiento_id}`
        : '/api/seguimiento';
      const method = isUpdate ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al guardar seguimiento');
        return;
      }

      onSubmitted();
    } catch {
      setError('Error de conexion');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Contacto -- SI/NO (required, large buttons for mobile) */}
      <div>
        <Label className="mb-2 block text-sm font-medium">
          Contacto <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-3">
          {CONTACTO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setContacto(opt.value)}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                contacto === opt.value
                  ? opt.value === 'SI'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-border bg-card text-body-text hover:bg-neutral-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Decision de Voto */}
      <div>
        <Label htmlFor="decision_voto" className="mb-1.5 block text-sm font-medium">
          Decision de Voto
        </Label>
        <SelectNative
          id="decision_voto"
          value={decisionVoto}
          onChange={(e) => setDecisionVoto(e.target.value)}
          placeholder="Seleccionar"
        >
          {DECISION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectNative>
      </div>

      {/* Decision Presidente */}
      <div>
        <Label htmlFor="decision_presidente" className="mb-1.5 block text-sm font-medium">
          Presidente
        </Label>
        <SelectNative
          id="decision_presidente"
          value={decisionPresidente}
          onChange={(e) => setDecisionPresidente(e.target.value)}
          placeholder="Seleccionar"
        >
          {DECISION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectNative>
      </div>

      {/* Comentario */}
      <div>
        <Label htmlFor="comentario" className="mb-1.5 block text-sm font-medium">
          Comentario
        </Label>
        <textarea
          id="comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Notas sobre la llamada (opcional)"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
        />
      </div>

      {/* Fecha Siguiente Seguimiento */}
      <div>
        <Label htmlFor="fecha_proximo" className="mb-1.5 block text-sm font-medium">
          Fecha Siguiente Seguimiento
        </Label>
        <Input
          id="fecha_proximo"
          type="date"
          value={fechaProximo}
          onChange={(e) => setFechaProximo(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="max-w-[200px]"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none">
          {submitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Guardar Seguimiento
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
