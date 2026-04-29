'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Movimiento } from '@/types/movimiento';

// ---------- Geo Types ----------

interface GeoOption {
  id: string;
  nombre: string;
}

// ---------- Constants ----------

const TIPO_ESTRUCTURA_OPTIONS = ['Movimiento', 'Comite', 'Frente', 'Otro'] as const;

const AMBITO_ACCION_OPTIONS = ['Nacional', 'Provincial', 'Municipal', 'Sectorial'] as const;

const EJES_TRABAJO_OPTIONS = [
  'Juventud',
  'Mujer',
  'Educacion',
  'Salud',
  'Transparencia',
  'Otro',
] as const;

const ESTRUCTURA_TERRITORIAL_OPTIONS = [
  'Coordinacion nacional',
  'Comunicaciones provinciales',
  'Estructuras sectoriales',
  'Comites municipales',
] as const;

const CANTIDAD_MIEMBROS_OPTIONS = [
  { value: '1-25', label: '1 a 25 miembros' },
  { value: '26-100', label: '26 a 100 miembros' },
  { value: '101-500', label: '101 a 500 miembros' },
  { value: '500+', label: 'Mas de 500 miembros' },
] as const;

const CARGO_REPRESENTANTE_OPTIONS = [
  'Coordinador/a',
  'Director/a',
  'Presidente/a',
  'Secretario/a',
] as const;

// ---------- Zod Schema ----------

const editSchema = z.object({
  nombre: z.string().min(1, 'El nombre del movimiento es requerido'),
  siglas: z.string().optional().default(''),
  tipo_estructura: z.enum(['Movimiento', 'Comite', 'Frente', 'Otro'], {
    message: 'Selecciona un tipo de estructura',
  }),
  fecha_fundacion: z.string().optional().default(''),
  ambito_accion: z.array(z.string()).default([]),
  descripcion: z.string().optional().default(''),
  ejes_trabajo: z.array(z.string()).default([]),
  ejes_trabajo_otro: z.string().optional().default(''),
  website: z.string().optional().default(''),
  instagram: z.string().optional().default(''),
  twitter: z.string().optional().default(''),
  representante_nombre: z.string().min(1, 'El nombre del representante es requerido'),
  representante_cedula: z.string().optional().default(''),
  representante_cargo: z.string().optional().default(''),
  representante_telefono: z.string().min(1, 'El telefono es requerido'),
  representante_email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electronico invalido'),
  representante_provincia_id: z.string().optional().default(''),
  representante_municipio_id: z.string().optional().default(''),
  representante_direccion: z.string().optional().default(''),
  equipo_enlace: z
    .array(
      z.object({
        nombre: z.string().min(1, 'El nombre es requerido'),
        email: z.string().optional().default(''),
        telefono: z.string().optional().default(''),
      })
    )
    .default([]),
  cantidad_miembros_estimada: z.string().min(1, 'Selecciona una cantidad estimada'),
  estructura_territorial: z.array(z.string()).default([]),
  zonas_comunidades: z.string().max(600, 'Maximo 600 caracteres').optional().default(''),
  experiencia_previa: z.string().max(600, 'Maximo 600 caracteres').optional().default(''),
  estado: z.boolean().default(true),
});

type EditFormData = z.infer<typeof editSchema>;

// ---------- Helpers ----------

function CheckboxGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (vals: string[]) => void;
}) {
  function toggle(opt: string) {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-primary-text">{label}</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={values.includes(opt)}
              onChange={() => toggle(opt)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ---------- Step Progress Bar ----------

function StepProgressBar({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: 'Datos del Movimiento' },
    { n: 2, label: 'Representante y Contactos' },
    { n: 3, label: 'Base Organizativa' },
  ];

  return (
    <nav aria-label="Pasos del formulario" className="mb-space-8">
      <ol className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const done = currentStep > step.n;
          const active = currentStep === step.n;

          return (
            <li key={step.n} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    done
                      ? 'bg-primary text-primary-foreground'
                      : active
                      ? 'border-2 border-primary bg-white text-primary'
                      : 'border-2 border-border bg-white text-muted-foreground'
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.n
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1 hidden text-xs sm:block',
                    active ? 'font-medium text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 mb-5 hidden h-[2px] flex-1 sm:block',
                    done ? 'bg-primary' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------- Page ----------

export default function EditarMovimientoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [municipios, setMunicipios] = useState<GeoOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema) as never,
    defaultValues: {
      nombre: '',
      siglas: '',
      tipo_estructura: undefined,
      fecha_fundacion: '',
      ambito_accion: [],
      descripcion: '',
      ejes_trabajo: [],
      ejes_trabajo_otro: '',
      website: '',
      instagram: '',
      twitter: '',
      representante_nombre: '',
      representante_cedula: '',
      representante_cargo: '',
      representante_telefono: '',
      representante_email: '',
      representante_provincia_id: '',
      representante_municipio_id: '',
      representante_direccion: '',
      equipo_enlace: [],
      cantidad_miembros_estimada: '',
      estructura_territorial: [],
      zonas_comunidades: '',
      experiencia_previa: '',
      estado: true,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'equipo_enlace' });

  const ambitoValues = watch('ambito_accion') ?? [];
  const ejesValues = watch('ejes_trabajo') ?? [];
  const estructuraValues = watch('estructura_territorial') ?? [];
  const showOtroEje = ejesValues.includes('Otro');
  const selectedProvincia = watch('representante_provincia_id');
  const zonasValue = watch('zonas_comunidades') ?? '';
  const experienciaValue = watch('experiencia_previa') ?? '';

  const fetchProvincias = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('provincias' as 'usuarios')
        .select('id, nombre')
        .order('nombre');
      if (data) setProvincias(data as unknown as GeoOption[]);
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchMunicipios = useCallback(async (provinciaId: string) => {
    if (!provinciaId) { setMunicipios([]); return; }
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('municipios' as 'usuarios')
        .select('id, nombre')
        .eq('provincia_id', provinciaId)
        .order('nombre');
      if (data) setMunicipios(data as unknown as GeoOption[]);
    } catch {
      setMunicipios([]);
    }
  }, []);

  useEffect(() => { fetchProvincias(); }, [fetchProvincias]);
  useEffect(() => {
    if (selectedProvincia) { fetchMunicipios(selectedProvincia); }
    else { setMunicipios([]); }
  }, [selectedProvincia, fetchMunicipios]);

  const fetchMovimiento = useCallback(async () => {
    setLoadingData(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/movimientos/${id}`);
      const json = await res.json();

      if (!res.ok) {
        setFetchError(json.error ?? 'Error al obtener el movimiento');
        return;
      }

      const m: Movimiento = json.movimiento;
      const redes = m.redes_sociales ?? {};

      reset({
        nombre: m.nombre,
        siglas: m.siglas ?? '',
        tipo_estructura: m.tipo_estructura as EditFormData['tipo_estructura'],
        fecha_fundacion: m.fecha_fundacion ?? '',
        ambito_accion: m.ambito_accion ?? [],
        descripcion: m.descripcion ?? '',
        ejes_trabajo: m.ejes_trabajo ?? [],
        ejes_trabajo_otro: '',
        website: (redes.website as string) ?? '',
        instagram: (redes.instagram as string) ?? '',
        twitter: (redes.twitter as string) ?? '',
        representante_nombre: m.representante_nombre ?? '',
        representante_cedula: m.representante_cedula ?? '',
        representante_cargo: m.representante_cargo ?? '',
        representante_telefono: m.representante_telefono ?? '',
        representante_email: m.representante_email ?? '',
        representante_provincia_id: m.representante_provincia_id ?? '',
        representante_municipio_id: m.representante_municipio_id ?? '',
        representante_direccion: m.representante_direccion ?? '',
        equipo_enlace: m.equipo_enlace ?? [],
        cantidad_miembros_estimada: m.cantidad_miembros_estimada ?? '',
        estructura_territorial: m.estructura_territorial ?? [],
        zonas_comunidades: m.zonas_comunidades ?? '',
        experiencia_previa: m.experiencia_previa ?? '',
        estado: m.estado,
      });

      if (m.representante_provincia_id) {
        fetchMunicipios(m.representante_provincia_id);
      }
    } catch {
      setFetchError('Error de conexion. Intenta nuevamente.');
    } finally {
      setLoadingData(false);
    }
  }, [id, reset, fetchMunicipios]);

  useEffect(() => { fetchMovimiento(); }, [fetchMovimiento]);

  async function onSubmit(data: EditFormData) {
    setSubmitting(true);
    setApiError(null);

    const ejesFinales = data.ejes_trabajo.includes('Otro') && data.ejes_trabajo_otro
      ? [...data.ejes_trabajo.filter((e) => e !== 'Otro'), data.ejes_trabajo_otro]
      : data.ejes_trabajo;

    const payload = {
      nombre: data.nombre,
      siglas: data.siglas || null,
      tipo_estructura: data.tipo_estructura,
      fecha_fundacion: data.fecha_fundacion || null,
      ambito_accion: data.ambito_accion.length ? data.ambito_accion : null,
      descripcion: data.descripcion || null,
      ejes_trabajo: ejesFinales.length ? ejesFinales : null,
      redes_sociales: {
        website: data.website || null,
        instagram: data.instagram || null,
        twitter: data.twitter || null,
      },
      representante_nombre: data.representante_nombre,
      representante_cedula: data.representante_cedula || null,
      representante_cargo: data.representante_cargo || null,
      representante_telefono: data.representante_telefono,
      representante_email: data.representante_email,
      representante_provincia_id: data.representante_provincia_id || null,
      representante_municipio_id: data.representante_municipio_id || null,
      representante_direccion: data.representante_direccion || null,
      equipo_enlace: data.equipo_enlace.length ? data.equipo_enlace : null,
      cantidad_miembros_estimada: data.cantidad_miembros_estimada,
      estructura_territorial: data.estructura_territorial.length
        ? data.estructura_territorial
        : null,
      zonas_comunidades: data.zonas_comunidades || null,
      experiencia_previa: data.experiencia_previa || null,
      estado: data.estado,
    };

    try {
      const res = await fetch(`/api/movimientos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? 'Error al actualizar el movimiento');
        setSubmitting(false);
        return;
      }

      router.push(`/movimientos/${id}`);
    } catch {
      setApiError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando movimiento...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <Link
          href="/movimientos"
          className="mb-space-4 inline-flex items-center gap-1 text-sm text-secondary-text hover:text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Movimientos
        </Link>
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4" role="alert">
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={fetchMovimiento} className="mt-2">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-space-6">
        <Link
          href={`/movimientos/${id}`}
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver al detalle
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Editar Movimiento
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Modifica los datos del movimiento. Los cambios se guardan al hacer clic en Guardar.
        </p>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <StepProgressBar currentStep={step} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* ---------- Step 1 ---------- */}
          <div className={step !== 1 ? 'hidden' : undefined}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="e-nombre">
                    Nombre del movimiento <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="e-nombre"
                    aria-invalid={!!errors.nombre}
                    {...register('nombre')}
                  />
                  {errors.nombre && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.nombre.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e-siglas">Siglas / Acronimo</Label>
                  <Input id="e-siglas" {...register('siglas')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e-tipo">
                    Tipo de estructura <span className="text-destructive">*</span>
                  </Label>
                  <SelectNative id="e-tipo" aria-invalid={!!errors.tipo_estructura} {...register('tipo_estructura')}>
                    <option value="" disabled>Seleccionar tipo</option>
                    {TIPO_ESTRUCTURA_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </SelectNative>
                  {errors.tipo_estructura && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.tipo_estructura.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e-fecha">Fecha de fundacion / inicio</Label>
                  <Input id="e-fecha" type="date" {...register('fecha_fundacion')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e-estado">Estado</Label>
                  <SelectNative
                    id="e-estado"
                    value={watch('estado') ? 'true' : 'false'}
                    onChange={(e) => setValue('estado', e.target.value === 'true')}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </SelectNative>
                </div>
              </div>

              <CheckboxGroup
                label="Ambito de accion"
                options={AMBITO_ACCION_OPTIONS}
                values={ambitoValues}
                onChange={(v) => setValue('ambito_accion', v)}
              />

              <div className="space-y-1.5">
                <Label htmlFor="e-descripcion">Descripcion breve</Label>
                <textarea
                  id="e-descripcion"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('descripcion')}
                />
              </div>

              <div className="space-y-3">
                <CheckboxGroup
                  label="Ejes principales de trabajo"
                  options={EJES_TRABAJO_OPTIONS}
                  values={ejesValues}
                  onChange={(v) => setValue('ejes_trabajo', v)}
                />
                {showOtroEje && (
                  <div className="space-y-1.5">
                    <Label htmlFor="e-otro-eje">Especifica el eje</Label>
                    <Input id="e-otro-eje" {...register('ejes_trabajo_otro')} />
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-primary-text">Redes sociales</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="e-website">Website</Label>
                    <Input id="e-website" type="url" placeholder="https://..." {...register('website')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="e-instagram">Instagram</Label>
                    <Input id="e-instagram" placeholder="@usuario" {...register('instagram')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="e-twitter">Twitter / X</Label>
                    <Input id="e-twitter" placeholder="@usuario" {...register('twitter')} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={() => setStep(2)}>Siguiente</Button>
              </div>
            </div>
          </div>

          {/* ---------- Step 2 ---------- */}
          <div className={step !== 2 ? 'hidden' : undefined}>
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold text-primary-text">
                  Representante principal
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="e-rep-nombre">
                      Nombres y apellidos <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="e-rep-nombre"
                      aria-invalid={!!errors.representante_nombre}
                      {...register('representante_nombre')}
                    />
                    {errors.representante_nombre && (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.representante_nombre.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-rep-cedula">Cedula / Documento</Label>
                    <Input id="e-rep-cedula" placeholder="000-0000000-0" {...register('representante_cedula')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-rep-cargo">Cargo</Label>
                    <SelectNative id="e-rep-cargo" {...register('representante_cargo')}>
                      <option value="">Seleccionar cargo</option>
                      {CARGO_REPRESENTANTE_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </SelectNative>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-rep-telefono">
                      Telefono <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="e-rep-telefono"
                      type="tel"
                      aria-invalid={!!errors.representante_telefono}
                      {...register('representante_telefono')}
                    />
                    {errors.representante_telefono && (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.representante_telefono.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-rep-email">
                      Correo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="e-rep-email"
                      type="email"
                      aria-invalid={!!errors.representante_email}
                      {...register('representante_email')}
                    />
                    {errors.representante_email && (
                      <p className="text-xs text-destructive" role="alert">
                        {errors.representante_email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-rep-provincia">Provincia</Label>
                    <SelectNative
                      id="e-rep-provincia"
                      {...register('representante_provincia_id')}
                      onChange={(e) => {
                        setValue('representante_provincia_id', e.target.value);
                        setValue('representante_municipio_id', '');
                      }}
                    >
                      <option value="">Seleccionar provincia</option>
                      {provincias.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </SelectNative>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-rep-municipio">Municipio</Label>
                    <SelectNative
                      id="e-rep-municipio"
                      disabled={!selectedProvincia}
                      {...register('representante_municipio_id')}
                    >
                      <option value="">Seleccionar municipio</option>
                      {municipios.map((m) => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </SelectNative>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="e-rep-direccion">Direccion</Label>
                    <Input id="e-rep-direccion" {...register('representante_direccion')} />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary-text">
                    Equipo de Enlace{' '}
                    <span className="font-normal text-muted-foreground">({fields.length}/5)</span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={fields.length >= 5}
                    onClick={() => append({ nombre: '', email: '', telefono: '' })}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Agregar contacto
                  </Button>
                </div>

                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay contactos de enlace.</p>
                )}

                <div className="space-y-3">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-3"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor={`e-enlace-${idx}-nombre`}>
                          Nombre <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`e-enlace-${idx}-nombre`}
                          aria-invalid={!!errors.equipo_enlace?.[idx]?.nombre}
                          {...register(`equipo_enlace.${idx}.nombre`)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`e-enlace-${idx}-email`}>Correo</Label>
                        <Input id={`e-enlace-${idx}-email`} type="email" {...register(`equipo_enlace.${idx}.email`)} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-end justify-between">
                          <Label htmlFor={`e-enlace-${idx}-telefono`}>Telefono</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(idx)}
                            aria-label={`Eliminar contacto ${idx + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                        <Input id={`e-enlace-${idx}-telefono`} type="tel" {...register(`equipo_enlace.${idx}.telefono`)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Anterior
                </Button>
                <Button type="button" onClick={() => setStep(3)}>Siguiente</Button>
              </div>
            </div>
          </div>

          {/* ---------- Step 3 ---------- */}
          <div className={step !== 3 ? 'hidden' : undefined}>
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-primary-text">
                  Cantidad estimada de miembros <span className="text-destructive">*</span>
                </legend>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
                  {CANTIDAD_MIEMBROS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        value={opt.value}
                        className="h-4 w-4 accent-primary"
                        {...register('cantidad_miembros_estimada')}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {errors.cantidad_miembros_estimada && (
                  <p className="mt-1 text-xs text-destructive" role="alert">
                    {errors.cantidad_miembros_estimada.message}
                  </p>
                )}
              </fieldset>

              <CheckboxGroup
                label="Estructura territorial"
                options={ESTRUCTURA_TERRITORIAL_OPTIONS}
                values={estructuraValues}
                onChange={(v) => setValue('estructura_territorial', v)}
              />

              <div className="space-y-1.5">
                <Label htmlFor="e-zonas">
                  Principales zonas / comunidades{' '}
                  <span className="text-muted-foreground">({zonasValue.length}/600)</span>
                </Label>
                <textarea
                  id="e-zonas"
                  rows={4}
                  maxLength={600}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('zonas_comunidades')}
                />
                {errors.zonas_comunidades && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.zonas_comunidades.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-experiencia">
                  Experiencia previa{' '}
                  <span className="text-muted-foreground">({experienciaValue.length}/600)</span>
                </Label>
                <textarea
                  id="e-experiencia"
                  rows={4}
                  maxLength={600}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('experiencia_previa')}
                />
                {errors.experiencia_previa && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.experiencia_previa.message}
                  </p>
                )}
              </div>

              {apiError && (
                <div
                  className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                  Anterior
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
