'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlantillaLlamada } from '@/types/seguimiento';

interface PlantillaFormProps {
  /** If provided, editing an existing template; otherwise creating new */
  plantilla?: PlantillaLlamada;
  /** Called after successful save */
  onSaved: () => void;
  /** Called when user cancels */
  onCancel: () => void;
}

const PLACEHOLDER_HELP = [
  { token: '{nombre}', desc: 'Nombre del individuo' },
  { token: '{apellido}', desc: 'Apellido del individuo' },
  { token: '{telefono}', desc: 'Numero de telefono' },
  { token: '{recinto}', desc: 'Nombre del recinto' },
  { token: '{colegio}', desc: 'Nombre del colegio' },
  { token: '{direccion}', desc: 'Direccion del recinto' },
  { token: '{cedula}', desc: 'Cedula del individuo' },
];

/**
 * Admin form to create or edit call script templates.
 * Shows placeholder reference and live preview.
 */
export function PlantillaForm({
  plantilla,
  onSaved,
  onCancel,
}: PlantillaFormProps) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [contenido, setContenido] = useState(plantilla?.contenido ?? '');
  const [activa, setActiva] = useState(plantilla?.activa ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!plantilla;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre es requerido');
      setSubmitting(false);
      return;
    }

    if (!contenido.trim()) {
      setError('El contenido es requerido');
      setSubmitting(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        contenido: contenido.trim(),
        activa,
      };

      if (isEdit) {
        payload.id = plantilla.id;
      }

      const res = await fetch('/api/seguimiento/plantillas', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al guardar plantilla');
        return;
      }

      onSaved();
    } catch {
      setError('Error de conexion');
    } finally {
      setSubmitting(false);
    }
  }

  // Sample preview with placeholder substitution
  const previewText = contenido
    .replace(/\{nombre\}/g, 'Maria')
    .replace(/\{apellido\}/g, 'Perez')
    .replace(/\{telefono\}/g, '809-555-1234')
    .replace(/\{recinto\}/g, 'Escuela Nacional #5')
    .replace(/\{colegio\}/g, 'A')
    .replace(/\{direccion\}/g, 'Calle Principal #10')
    .replace(/\{cedula\}/g, '001-1234567-8');

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

      {/* Nombre */}
      <div>
        <Label htmlFor="nombre" className="mb-1.5 block text-sm font-medium">
          Nombre de la Plantilla <span className="text-destructive">*</span>
        </Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Guion de llamada principal"
        />
      </div>

      {/* Contenido */}
      <div>
        <Label htmlFor="contenido" className="mb-1.5 block text-sm font-medium">
          Contenido del Guion <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="contenido"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Buenos dias {nombre} {apellido}, le habla..."
          className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          rows={6}
        />
      </div>

      {/* Placeholder reference */}
      <div className="rounded-lg border bg-neutral-50 p-3">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
          Variables disponibles
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {PLACEHOLDER_HELP.map((ph) => (
            <div key={ph.token} className="text-xs">
              <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-primary">
                {ph.token}
              </code>{' '}
              <span className="text-muted-foreground">{ph.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {contenido.trim() && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">
            Vista previa
          </p>
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">
              {previewText}
            </p>
          </div>
        </div>
      )}

      {/* Activa toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="activa"
          checked={activa}
          onChange={(e) => setActiva(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
        />
        <Label htmlFor="activa" className="text-sm">
          Plantilla activa
        </Label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {isEdit ? 'Guardar Cambios' : 'Crear Plantilla'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
