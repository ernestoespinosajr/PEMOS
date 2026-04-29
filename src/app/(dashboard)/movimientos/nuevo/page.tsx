'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

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

const DRAFT_KEY_PREFIX = 'pemos_movimiento_draft_';

// ---------- Zod Schema ----------

const step1Schema = z.object({
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
});

const step2Schema = z.object({
  representante_nombre: z.string().min(1, 'El nombre del representante es requerido'),
  representante_cedula: z.string().optional().default(''),
  representante_cargo: z.string().optional().default(''),
  representante_telefono: z.string().min(1, 'El telefono del representante es requerido'),
  representante_email: z
    .string()
    .min(1, 'El correo del representante es requerido')
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
});

const step3Schema = z.object({
  cantidad_miembros_estimada: z.string().min(1, 'Selecciona una cantidad estimada'),
  estructura_territorial: z.array(z.string()).default([]),
  zonas_comunidades: z
    .string()
    .max(600, 'Maximo 600 caracteres')
    .optional()
    .default(''),
  experiencia_previa: z
    .string()
    .max(600, 'Maximo 600 caracteres')
    .optional()
    .default(''),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

// ---------- Progress Bar ----------

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
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
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

// ---------- Multi-checkbox helper ----------

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

// ---------- Step 1 ----------

function Step1Form({
  defaultValues,
  onNext,
  onSaveDraft,
}: {
  defaultValues: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
  onSaveDraft: (data: Partial<Step1Data>) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema) as never,
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
      ...defaultValues,
    },
  });

  const ambitoValues = watch('ambito_accion') ?? [];
  const ejesValues = watch('ejes_trabajo') ?? [];
  const showOtroEje = ejesValues.includes('Otro');

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="s1-nombre">
            Nombre del movimiento <span className="text-destructive">*</span>
          </Label>
          <Input
            id="s1-nombre"
            placeholder="Nombre oficial del movimiento"
            aria-invalid={!!errors.nombre}
            aria-describedby={errors.nombre ? 's1-nombre-error' : undefined}
            {...register('nombre')}
          />
          {errors.nombre && (
            <p id="s1-nombre-error" className="text-xs text-destructive" role="alert">
              {errors.nombre.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="s1-siglas">Siglas / Acronimo</Label>
          <Input
            id="s1-siglas"
            placeholder="Ej. MLN, FPD"
            {...register('siglas')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="s1-tipo">
            Tipo de estructura <span className="text-destructive">*</span>
          </Label>
          <SelectNative
            id="s1-tipo"
            aria-invalid={!!errors.tipo_estructura}
            aria-describedby={errors.tipo_estructura ? 's1-tipo-error' : undefined}
            {...register('tipo_estructura')}
          >
            <option value="" disabled>
              Seleccionar tipo
            </option>
            {TIPO_ESTRUCTURA_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectNative>
          {errors.tipo_estructura && (
            <p id="s1-tipo-error" className="text-xs text-destructive" role="alert">
              {errors.tipo_estructura.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="s1-fecha">Fecha de fundacion / inicio</Label>
          <Input
            id="s1-fecha"
            type="date"
            {...register('fecha_fundacion')}
          />
        </div>
      </div>

      <CheckboxGroup
        label="Ambito de accion"
        options={AMBITO_ACCION_OPTIONS}
        values={ambitoValues}
        onChange={(v) => setValue('ambito_accion', v)}
      />

      <div className="space-y-1.5">
        <Label htmlFor="s1-descripcion">Descripcion breve</Label>
        <textarea
          id="s1-descripcion"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Descripcion general del movimiento"
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
            <Label htmlFor="s1-otro-eje">Especifica el eje</Label>
            <Input
              id="s1-otro-eje"
              placeholder="Describe el eje de trabajo"
              {...register('ejes_trabajo_otro')}
            />
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-primary-text">Redes sociales</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="s1-website">Website</Label>
            <Input
              id="s1-website"
              type="url"
              placeholder="https://..."
              {...register('website')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s1-instagram">Instagram</Label>
            <Input
              id="s1-instagram"
              placeholder="@usuario"
              {...register('instagram')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s1-twitter">Twitter / X</Label>
            <Input
              id="s1-twitter"
              placeholder="@usuario"
              {...register('twitter')}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSaveDraft(watch())}
        >
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          Guardar y continuar luego
        </Button>
        <Button type="submit">
          Siguiente
        </Button>
      </div>
    </form>
  );
}

// ---------- Step 2 ----------

function Step2Form({
  defaultValues,
  onNext,
  onPrev,
  onSaveDraft,
}: {
  defaultValues: Partial<Step2Data>;
  onNext: (data: Step2Data) => void;
  onPrev: () => void;
  onSaveDraft: (data: Partial<Step2Data>) => void;
}) {
  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [municipios, setMunicipios] = useState<GeoOption[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema) as never,
    defaultValues: {
      representante_nombre: '',
      representante_cedula: '',
      representante_cargo: '',
      representante_telefono: '',
      representante_email: '',
      representante_provincia_id: '',
      representante_municipio_id: '',
      representante_direccion: '',
      equipo_enlace: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'equipo_enlace',
  });

  const selectedProvincia = watch('representante_provincia_id');

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
    if (!provinciaId) {
      setMunicipios([]);
      return;
    }
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

  useEffect(() => {
    fetchProvincias();
  }, [fetchProvincias]);

  useEffect(() => {
    if (selectedProvincia) {
      fetchMunicipios(selectedProvincia);
    } else {
      setMunicipios([]);
    }
  }, [selectedProvincia, fetchMunicipios]);

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6" noValidate>
      <div>
        <p className="mb-3 text-sm font-semibold text-primary-text">
          Representante principal
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s2-rep-nombre">
              Nombres y apellidos <span className="text-destructive">*</span>
            </Label>
            <Input
              id="s2-rep-nombre"
              placeholder="Nombre completo"
              aria-invalid={!!errors.representante_nombre}
              aria-describedby={
                errors.representante_nombre ? 's2-rep-nombre-error' : undefined
              }
              {...register('representante_nombre')}
            />
            {errors.representante_nombre && (
              <p id="s2-rep-nombre-error" className="text-xs text-destructive" role="alert">
                {errors.representante_nombre.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s2-rep-cedula">Cedula / Documento</Label>
            <Input
              id="s2-rep-cedula"
              placeholder="000-0000000-0"
              {...register('representante_cedula')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s2-rep-cargo">Cargo dentro del movimiento</Label>
            <SelectNative id="s2-rep-cargo" {...register('representante_cargo')}>
              <option value="">Seleccionar cargo</option>
              {CARGO_REPRESENTANTE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectNative>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s2-rep-telefono">
              Telefono movil (WhatsApp) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="s2-rep-telefono"
              type="tel"
              placeholder="809-000-0000"
              aria-invalid={!!errors.representante_telefono}
              aria-describedby={
                errors.representante_telefono ? 's2-rep-telefono-error' : undefined
              }
              {...register('representante_telefono')}
            />
            {errors.representante_telefono && (
              <p
                id="s2-rep-telefono-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.representante_telefono.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s2-rep-email">
              Correo electronico <span className="text-destructive">*</span>
            </Label>
            <Input
              id="s2-rep-email"
              type="email"
              placeholder="correo@ejemplo.com"
              aria-invalid={!!errors.representante_email}
              aria-describedby={
                errors.representante_email ? 's2-rep-email-error' : undefined
              }
              {...register('representante_email')}
            />
            {errors.representante_email && (
              <p
                id="s2-rep-email-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.representante_email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s2-rep-provincia">Provincia de residencia</Label>
            <SelectNative
              id="s2-rep-provincia"
              {...register('representante_provincia_id')}
              onChange={(e) => {
                setValue('representante_provincia_id', e.target.value);
                setValue('representante_municipio_id', '');
              }}
            >
              <option value="">Seleccionar provincia</option>
              {provincias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </SelectNative>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s2-rep-municipio">Municipio de residencia</Label>
            <SelectNative
              id="s2-rep-municipio"
              disabled={!selectedProvincia}
              {...register('representante_municipio_id')}
            >
              <option value="">Seleccionar municipio</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </SelectNative>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="s2-rep-direccion">Direccion</Label>
            <Input
              id="s2-rep-direccion"
              placeholder="Calle, numero, sector (opcional)"
              {...register('representante_direccion')}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-primary-text">
            Equipo de Enlace{' '}
            <span className="font-normal text-muted-foreground">
              ({fields.length}/5)
            </span>
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
          <p className="text-sm text-muted-foreground">
            No hay contactos de enlace agregados.
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`enlace-${idx}-nombre`}>
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`enlace-${idx}-nombre`}
                  placeholder="Nombre completo"
                  aria-invalid={!!errors.equipo_enlace?.[idx]?.nombre}
                  {...register(`equipo_enlace.${idx}.nombre`)}
                />
                {errors.equipo_enlace?.[idx]?.nombre && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.equipo_enlace[idx]?.nombre?.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`enlace-${idx}-email`}>Correo</Label>
                <Input
                  id={`enlace-${idx}-email`}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  {...register(`equipo_enlace.${idx}.email`)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-end justify-between">
                  <Label htmlFor={`enlace-${idx}-telefono`}>Telefono</Label>
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
                <Input
                  id={`enlace-${idx}-telefono`}
                  type="tel"
                  placeholder="809-000-0000"
                  {...register(`equipo_enlace.${idx}.telefono`)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onPrev}>
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSaveDraft(watch())}
          >
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            Guardar y continuar luego
          </Button>
        </div>
        <Button type="submit">Siguiente</Button>
      </div>
    </form>
  );
}

// ---------- Step 3 ----------

function Step3Form({
  defaultValues,
  onSubmit,
  onPrev,
  onSaveDraft,
  submitting,
  apiError,
}: {
  defaultValues: Partial<Step3Data>;
  onSubmit: (data: Step3Data) => void;
  onPrev: () => void;
  onSaveDraft: (data: Partial<Step3Data>) => void;
  submitting: boolean;
  apiError: string | null;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema) as never,
    defaultValues: {
      cantidad_miembros_estimada: '',
      estructura_territorial: [],
      zonas_comunidades: '',
      experiencia_previa: '',
      ...defaultValues,
    },
  });

  const estructuraValues = watch('estructura_territorial') ?? [];
  const zonasValue = watch('zonas_comunidades') ?? '';
  const experienciaValue = watch('experiencia_previa') ?? '';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-2">
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
                  aria-invalid={!!errors.cantidad_miembros_estimada}
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
      </div>

      <CheckboxGroup
        label="Estructura territorial"
        options={ESTRUCTURA_TERRITORIAL_OPTIONS}
        values={estructuraValues}
        onChange={(v) => setValue('estructura_territorial', v)}
      />

      <div className="space-y-1.5">
        <Label htmlFor="s3-zonas">
          Principales zonas / comunidades{' '}
          <span className="text-muted-foreground">
            ({zonasValue.length}/600)
          </span>
        </Label>
        <textarea
          id="s3-zonas"
          rows={4}
          maxLength={600}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Describe las principales zonas y comunidades donde opera el movimiento"
          aria-invalid={!!errors.zonas_comunidades}
          aria-describedby={errors.zonas_comunidades ? 's3-zonas-error' : undefined}
          {...register('zonas_comunidades')}
        />
        {errors.zonas_comunidades && (
          <p id="s3-zonas-error" className="text-xs text-destructive" role="alert">
            {errors.zonas_comunidades.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="s3-experiencia">
          Experiencia previa{' '}
          <span className="text-muted-foreground">
            ({experienciaValue.length}/600)
          </span>
        </Label>
        <textarea
          id="s3-experiencia"
          rows={4}
          maxLength={600}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Describe la experiencia previa del movimiento en actividades politicas o comunitarias"
          aria-invalid={!!errors.experiencia_previa}
          aria-describedby={errors.experiencia_previa ? 's3-experiencia-error' : undefined}
          {...register('experiencia_previa')}
        />
        {errors.experiencia_previa && (
          <p id="s3-experiencia-error" className="text-xs text-destructive" role="alert">
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
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onPrev} disabled={submitting}>
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSaveDraft(watch())}
            disabled={submitting}
          >
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            Guardar y continuar luego
          </Button>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Crear Movimiento
        </Button>
      </div>
    </form>
  );
}

// ---------- Page ----------

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  function buildDraftKey(name?: string): string {
    return DRAFT_KEY_PREFIX + (name ?? 'unnamed');
  }

  function saveDraft(partial: Partial<Step1Data & Step2Data & Step3Data>) {
    try {
      const key = buildDraftKey(step1Data?.nombre ?? (partial as Partial<Step1Data>).nombre);
      localStorage.setItem(key, JSON.stringify({ step, step1Data, step2Data, ...partial }));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch {
      // localStorage may not be available
    }
  }

  function clearDraft() {
    try {
      const key = buildDraftKey(step1Data?.nombre);
      localStorage.removeItem(key);
    } catch {
      // Non-fatal
    }
  }

  function handleStep1Next(data: Step1Data) {
    setStep1Data(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleStep2Next(data: Step2Data) {
    setStep2Data(data);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleStep3Submit(data: Step3Data) {
    if (!step1Data || !step2Data) return;

    setSubmitting(true);
    setApiError(null);

    const ejesFinales = step1Data.ejes_trabajo.includes('Otro') && step1Data.ejes_trabajo_otro
      ? [
          ...step1Data.ejes_trabajo.filter((e) => e !== 'Otro'),
          step1Data.ejes_trabajo_otro,
        ]
      : step1Data.ejes_trabajo;

    const payload = {
      nombre: step1Data.nombre,
      siglas: step1Data.siglas || null,
      tipo_estructura: step1Data.tipo_estructura,
      fecha_fundacion: step1Data.fecha_fundacion || null,
      ambito_accion: step1Data.ambito_accion.length ? step1Data.ambito_accion : null,
      descripcion: step1Data.descripcion || null,
      ejes_trabajo: ejesFinales.length ? ejesFinales : null,
      redes_sociales: {
        website: step1Data.website || null,
        instagram: step1Data.instagram || null,
        twitter: step1Data.twitter || null,
      },
      representante_nombre: step2Data.representante_nombre,
      representante_cedula: step2Data.representante_cedula || null,
      representante_cargo: step2Data.representante_cargo || null,
      representante_telefono: step2Data.representante_telefono,
      representante_email: step2Data.representante_email,
      representante_provincia_id: step2Data.representante_provincia_id || null,
      representante_municipio_id: step2Data.representante_municipio_id || null,
      representante_direccion: step2Data.representante_direccion || null,
      equipo_enlace: step2Data.equipo_enlace.length ? step2Data.equipo_enlace : null,
      cantidad_miembros_estimada: data.cantidad_miembros_estimada,
      estructura_territorial: data.estructura_territorial.length
        ? data.estructura_territorial
        : null,
      zonas_comunidades: data.zonas_comunidades || null,
      experiencia_previa: data.experiencia_previa || null,
      estado: true,
    };

    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? 'Error al crear el movimiento');
        setSubmitting(false);
        return;
      }

      clearDraft();
      router.push('/movimientos');
    } catch {
      setApiError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-space-6">
        <Link
          href="/movimientos"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Movimientos
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Nuevo Movimiento
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Completa los tres pasos para registrar un nuevo movimiento.
        </p>
      </div>

      {draftSaved && (
        <div
          className="mb-space-4 rounded-md border border-green-200 bg-green-50 px-4 py-2"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-green-700">
            Borrador guardado localmente.
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <StepProgressBar currentStep={step} />

        {step === 1 && (
          <Step1Form
            defaultValues={step1Data ?? {}}
            onNext={handleStep1Next}
            onSaveDraft={saveDraft}
          />
        )}

        {step === 2 && (
          <Step2Form
            defaultValues={step2Data ?? {}}
            onNext={handleStep2Next}
            onPrev={() => setStep(1)}
            onSaveDraft={saveDraft}
          />
        )}

        {step === 3 && (
          <Step3Form
            defaultValues={{}}
            onSubmit={handleStep3Submit}
            onPrev={() => setStep(2)}
            onSaveDraft={saveDraft}
            submitting={submitting}
            apiError={apiError}
          />
        )}
      </div>
    </div>
  );
}
