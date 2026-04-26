'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ColegioFormInlineProps {
  recintoId: string;
  onCreated: () => void;
}

/**
 * Inline form to add a colegio to a recinto.
 * Shows code + name inputs with an "Agregar" button.
 */
export function ColegioFormInline({
  recintoId,
  onCreated,
}: ColegioFormInlineProps) {
  const [codColegio, setCodColegio] = useState('');
  const [nombre, setNombre] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!codColegio.trim()) {
      setError('El codigo del colegio es requerido');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/electoral/recintos/${recintoId}/colegios`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cod_colegio: codColegio.trim(),
            nombre: nombre.trim() || null,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error al crear colegio');
        return;
      }

      // Reset and notify parent
      setCodColegio('');
      setNombre('');
      onCreated();
    } catch {
      setError('Error de conexion');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-shrink-0 sm:w-32">
        <Input
          value={codColegio}
          onChange={(e) => setCodColegio(e.target.value)}
          placeholder="Codigo *"
          disabled={submitting}
          aria-label="Codigo del colegio"
        />
      </div>
      <div className="flex-1">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre (opcional)"
          disabled={submitting}
          aria-label="Nombre del colegio"
        />
      </div>
      <Button type="submit" size="sm" disabled={submitting} className="flex-shrink-0">
        {submitting ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
        )}
        Agregar
      </Button>
      {error && (
        <p className="text-sm text-destructive sm:hidden">{error}</p>
      )}
    </form>
  );
}
