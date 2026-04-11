'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { PeriodoSelector } from '@/components/electoral/periodo-selector';
import { createClient } from '@/lib/supabase/client';
import type { Candidato, PartidoOption } from '@/types/electoral';

// ---------- Zod Schema ----------

const candidatoFormSchema = z.object({
  nombre: z.string().min(2, 'El nombre es requerido (minimo 2 caracteres)'),
  partido_id: z.string().min(1, 'Selecciona un partido'),
  orden: z.coerce
    .number({ error: 'El orden es requerido' })
    .int('Debe ser un numero entero')
    .min(0, 'El orden debe ser 0 o mayor'),
  cargo_id: z.string().optional().default(''),
});

type CandidatoFormValues = {
  nombre: string;
  partido_id: string;
  orden: number;
  cargo_id: string;
};

// ---------- Props ----------

interface CandidatoFormProps {
  /** Existing candidato for edit mode */
  candidato?: Candidato | null;
  /** Pre-selected periodo */
  periodoId?: string;
  onSubmit: (data: CandidatoFormValues & { periodo_id: string }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

/**
 * Shared create/edit form for candidatos.
 * Uses react-hook-form + zod for validation.
 */
export function CandidatoForm({
  candidato,
  periodoId: initialPeriodoId,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
}: CandidatoFormProps) {
  const [partidos, setPartidos] = useState<PartidoOption[]>([]);
  const [loadingPartidos, setLoadingPartidos] = useState(true);
  const [periodoId, setPeriodoId] = useState(initialPeriodoId ?? candidato?.periodo_id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(candidatoFormSchema),
    defaultValues: {
      nombre: candidato?.nombre ?? '',
      partido_id: candidato?.partido_id ?? '',
      orden: candidato?.orden ?? 0,
      cargo_id: '',
    } satisfies CandidatoFormValues,
  });

  // Fetch partidos
  useEffect(() => {
    async function fetchPartidos() {
      setLoadingPartidos(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('partidos')
          .select('id, nombre, siglas, color')
          .eq('estado', true)
          .order('nombre');

        if (!error && data) {
          setPartidos(data as PartidoOption[]);
        }
      } catch (err) {
        console.error('Error fetching partidos:', err);
      } finally {
        setLoadingPartidos(false);
      }
    }
    fetchPartidos();
  }, []);

  async function onFormSubmit(values: Record<string, unknown>) {
    if (!periodoId) {
      setApiError('Selecciona un periodo electoral');
      return;
    }

    setSubmitting(true);
    setApiError(null);
    try {
      await onSubmit({
        nombre: values.nombre as string,
        partido_id: values.partido_id as string,
        orden: values.orden as number,
        cargo_id: values.cargo_id as string,
        periodo_id: periodoId,
      });
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Error al guardar candidato'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {apiError && (
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
        >
          <p className="text-sm text-destructive">{apiError}</p>
        </div>
      )}

      {/* Periodo Selector */}
      <PeriodoSelector
        value={periodoId}
        onChange={setPeriodoId}
        autoSelectActive={!candidato}
      />

      {/* Nombre */}
      <div>
        <Label htmlFor="nombre">Nombre del Candidato *</Label>
        <Input
          id="nombre"
          {...register('nombre')}
          placeholder="Nombre completo"
          className="mt-1.5"
        />
        {errors.nombre && (
          <p className="mt-1 text-sm text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      {/* Partido */}
      <div>
        <Label htmlFor="partido_id">Partido *</Label>
        {loadingPartidos ? (
          <div className="mt-1.5 flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando partidos...</span>
          </div>
        ) : (
          <SelectNative
            id="partido_id"
            {...register('partido_id')}
            placeholder="Seleccionar partido"
            className="mt-1.5"
          >
            {partidos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.siglas ? ` (${p.siglas})` : ''}
              </option>
            ))}
          </SelectNative>
        )}
        {errors.partido_id && (
          <p className="mt-1 text-sm text-destructive">
            {errors.partido_id.message}
          </p>
        )}
      </div>

      {/* Orden */}
      <div>
        <Label htmlFor="orden">Orden en Boleta *</Label>
        <Input
          id="orden"
          type="number"
          min={0}
          {...register('orden')}
          placeholder="0"
          className="mt-1.5 max-w-[120px]"
        />
        {errors.orden && (
          <p className="mt-1 text-sm text-destructive">{errors.orden.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
