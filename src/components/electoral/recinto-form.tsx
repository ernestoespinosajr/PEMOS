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
import { createClient } from '@/lib/supabase/client';
import type { Recinto } from '@/types/electoral';

// ---------- Geo Option ----------

interface GeoOption {
  id: string;
  nombre: string;
}

// ---------- Zod Schema ----------

const recintoFormSchema = z.object({
  cod_recinto: z.string().min(1, 'El codigo del recinto es requerido'),
  nombre: z.string().min(2, 'El nombre es requerido (minimo 2 caracteres)'),
  direccion: z.string().optional().default(''),
  municipio_id: z.string().min(1, 'Selecciona un municipio'),
  circunscripcion_id: z.string().optional().default(''),
});

type RecintoFormValues = {
  cod_recinto: string;
  nombre: string;
  direccion: string;
  municipio_id: string;
  circunscripcion_id: string;
};

// ---------- Props ----------

interface RecintoFormProps {
  recinto?: Recinto | null;
  onSubmit: (data: RecintoFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function RecintoForm({
  recinto,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
}: RecintoFormProps) {
  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [municipios, setMunicipios] = useState<GeoOption[]>([]);
  const [circunscripciones, setCircunscripciones] = useState<GeoOption[]>([]);
  const [selectedProvinciaId, setSelectedProvinciaId] = useState('');
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(recintoFormSchema),
    defaultValues: {
      cod_recinto: recinto?.cod_recinto ?? '',
      nombre: recinto?.nombre ?? '',
      direccion: recinto?.direccion ?? '',
      municipio_id: recinto?.municipio_id ?? '',
      circunscripcion_id: recinto?.circunscripcion_id ?? '',
    } satisfies RecintoFormValues,
  });

  const watchMunicipioId = watch('municipio_id');

  // Fetch provincias on mount
  useEffect(() => {
    async function fetchProvincias() {
      setLoadingGeo(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('provincias')
          .select('id, nombre')
          .eq('estado', true)
          .order('nombre');

        setProvincias((data ?? []) as GeoOption[]);

        // If editing, find the province for the current municipio
        if (recinto?.municipio_id) {
          const { data: mun } = await supabase
            .from('municipios')
            .select('provincia_id')
            .eq('id', recinto.municipio_id)
            .single();
          if (mun) {
            setSelectedProvinciaId(
              (mun as Record<string, unknown>).provincia_id as string
            );
          }
        }
      } catch (err) {
        console.error('Error fetching provincias:', err);
      } finally {
        setLoadingGeo(false);
      }
    }
    fetchProvincias();
  }, [recinto?.municipio_id]);

  // Fetch municipios when provincia changes
  useEffect(() => {
    if (!selectedProvinciaId) {
      setMunicipios([]);
      return;
    }

    async function fetchMunicipios() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('municipios')
          .select('id, nombre')
          .eq('provincia_id', selectedProvinciaId)
          .eq('estado', true)
          .order('nombre');

        setMunicipios((data ?? []) as GeoOption[]);
      } catch (err) {
        console.error('Error fetching municipios:', err);
      }
    }
    fetchMunicipios();
  }, [selectedProvinciaId]);

  // Fetch circunscripciones when municipio changes
  useEffect(() => {
    if (!watchMunicipioId) {
      setCircunscripciones([]);
      return;
    }

    async function fetchCircunscripciones() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('circunscripciones')
          .select('id, nombre')
          .eq('municipio_id', watchMunicipioId)
          .eq('estado', true)
          .order('nombre');

        setCircunscripciones((data ?? []) as GeoOption[]);
      } catch (err) {
        console.error('Error fetching circunscripciones:', err);
      }
    }
    fetchCircunscripciones();
  }, [watchMunicipioId]);

  async function onFormSubmit(values: Record<string, unknown>) {
    setSubmitting(true);
    setApiError(null);
    try {
      await onSubmit({
        cod_recinto: values.cod_recinto as string,
        nombre: values.nombre as string,
        direccion: values.direccion as string,
        municipio_id: values.municipio_id as string,
        circunscripcion_id: values.circunscripcion_id as string,
      });
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Error al guardar recinto'
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

      {/* Codigo */}
      <div>
        <Label htmlFor="cod_recinto">Codigo del Recinto *</Label>
        <Input
          id="cod_recinto"
          {...register('cod_recinto')}
          placeholder="Ej: REC-001"
          className="mt-1.5 max-w-[200px]"
        />
        {errors.cod_recinto && (
          <p className="mt-1 text-sm text-destructive">
            {errors.cod_recinto.message}
          </p>
        )}
      </div>

      {/* Nombre */}
      <div>
        <Label htmlFor="nombre">Nombre *</Label>
        <Input
          id="nombre"
          {...register('nombre')}
          placeholder="Nombre del recinto"
          className="mt-1.5"
        />
        {errors.nombre && (
          <p className="mt-1 text-sm text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      {/* Direccion */}
      <div>
        <Label htmlFor="direccion">Direccion</Label>
        <Input
          id="direccion"
          {...register('direccion')}
          placeholder="Direccion del recinto"
          className="mt-1.5"
        />
      </div>

      {/* Provincia (cascading) */}
      <div>
        <Label htmlFor="provincia">Provincia *</Label>
        {loadingGeo ? (
          <div className="mt-1.5 flex h-9 items-center gap-2 rounded-md border border-input px-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando...</span>
          </div>
        ) : (
          <SelectNative
            id="provincia"
            value={selectedProvinciaId}
            onChange={(e) => {
              setSelectedProvinciaId(e.target.value);
              setValue('municipio_id', '');
              setValue('circunscripcion_id', '');
            }}
            placeholder="Seleccionar provincia"
            className="mt-1.5"
          >
            {provincias.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {/* Municipio */}
      <div>
        <Label htmlFor="municipio_id">Municipio *</Label>
        <SelectNative
          id="municipio_id"
          {...register('municipio_id')}
          placeholder="Seleccionar municipio"
          className="mt-1.5"
          disabled={!selectedProvinciaId}
        >
          {municipios.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </SelectNative>
        {errors.municipio_id && (
          <p className="mt-1 text-sm text-destructive">
            {errors.municipio_id.message}
          </p>
        )}
      </div>

      {/* Circunscripcion */}
      <div>
        <Label htmlFor="circunscripcion_id">Circunscripcion</Label>
        <SelectNative
          id="circunscripcion_id"
          {...register('circunscripcion_id')}
          placeholder="Seleccionar circunscripcion (opcional)"
          className="mt-1.5"
          disabled={!watchMunicipioId}
        >
          <option value="">Sin circunscripcion</option>
          {circunscripciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </SelectNative>
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
