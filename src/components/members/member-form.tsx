'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  UserCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { CoordinatorSelect } from '@/components/members/coordinator-select';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  TIPO_MIEMBRO_LABELS,
  formatCedula,
  stripCedula,
} from '@/types/member';
import type {
  Member,
  MemberType,
  CreateMemberData,
  RedesSociales,
} from '@/types/member';

// ---------- Geo Option ----------

interface GeoOption {
  id: string;
  nombre: string;
}

// ---------- Zod Schema ----------

const memberFormSchema = z.object({
  cedula: z
    .string()
    .min(1, 'La cedula es requerida')
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '');
        return digits.length === 11;
      },
      { message: 'La cedula debe tener 11 digitos' }
    ),
  nombre: z.string().min(2, 'El nombre es requerido (minimo 2 caracteres)'),
  apellido: z
    .string()
    .min(2, 'El apellido es requerido (minimo 2 caracteres)'),
  tipo_miembro: z.enum(['coordinador', 'multiplicador', 'relacionado'], {
    message: 'Selecciona un tipo de miembro',
  }),
  apodo: z.string().optional().default(''),
  sexo: z.string().optional().default(''),
  fecha_nacimiento: z.string().optional().default(''),
  ocupacion: z.string().optional().default(''),
  telefono: z.string().optional().default(''),
  celular: z.string().optional().default(''),
  email: z
    .string()
    .optional()
    .default('')
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Formato de correo invalido',
    }),
  direccion: z.string().optional().default(''),
  facebook: z.string().optional().default(''),
  twitter: z.string().optional().default(''),
  instagram: z.string().optional().default(''),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

// ---------- Props ----------

interface MemberFormProps {
  /** Existing member for edit mode. Null = create mode. */
  member?: Member | null;
  /** Called on successful submit. */
  onSubmit: (data: CreateMemberData) => Promise<void>;
  /** Called when user cancels. */
  onCancel: () => void;
  /** Submit button label override. */
  submitLabel?: string;
}

// ---------- Component ----------

/**
 * Shared member form used by both the create and edit pages.
 *
 * Mobile-first layout: single column on mobile, two columns on desktop.
 * Sections: Datos Personales, Contacto, Redes Sociales, Ubicacion Geografica,
 * Asignacion Organizacional, Foto.
 */
export function MemberForm({
  member,
  onSubmit,
  onCancel,
  submitLabel,
}: MemberFormProps) {
  const isEdit = !!member;
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSocial, setShowSocial] = useState(false);

  // Geographic state (not part of react-hook-form since cascading)
  const [provinciaId, setProvinciaId] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [circunscripcionId, setCircunscripcionId] = useState('');
  const [sectorId, setSectorId] = useState('');

  // Coordinator
  const [coordinadorId, setCoordinadorId] = useState<string | null>(null);

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Geo data
  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [municipios, setMunicipios] = useState<GeoOption[]>([]);
  const [circunscripciones, setCircunscripciones] = useState<GeoOption[]>([]);
  const [sectores, setSectores] = useState<GeoOption[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  const redes = (member?.redes_sociales ?? {}) as RedesSociales;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<MemberFormValues>({
    // Zod v4 + @hookform/resolvers — .default() narrows inferred type, mismatching MemberFormValues optionality
    resolver: zodResolver(memberFormSchema) as never,
    defaultValues: {
      cedula: member ? formatCedula(member.cedula) : '',
      nombre: member?.nombre ?? '',
      apellido: member?.apellido ?? '',
      tipo_miembro: member?.tipo_miembro ?? undefined,
      apodo: member?.apodo ?? '',
      sexo: member?.sexo ?? '',
      fecha_nacimiento: member?.fecha_nacimiento ?? '',
      ocupacion: member?.ocupacion ?? '',
      telefono: member?.telefono ?? '',
      celular: member?.celular ?? '',
      email: member?.email ?? '',
      direccion: member?.direccion ?? '',
      facebook: redes.facebook ?? '',
      twitter: redes.twitter ?? '',
      instagram: redes.instagram ?? '',
    },
  });

  const tipoMiembro = watch('tipo_miembro');
  const needsCoordinator =
    tipoMiembro === 'multiplicador' || tipoMiembro === 'relacionado';

  // Initialize edit mode geographic data
  useEffect(() => {
    if (!member?.sector_id) return;

    async function loadGeo() {
      setLoadingGeo(true);
      try {
        const supabase = createClient();

        // Resolve sector -> circunscripcion -> municipio -> provincia
        const { data: sector } = await supabase
          .from('sectores')
          .select('id, circunscripcion_id')
          .eq('id', member!.sector_id!)
          .single();

        if (!sector) return;
        setSectorId(sector.id);

        const { data: circ } = await supabase
          .from('circunscripciones')
          .select('id, municipio_id')
          .eq('id', sector.circunscripcion_id)
          .single();

        if (!circ) return;
        setCircunscripcionId(circ.id);

        const { data: mun } = await supabase
          .from('municipios')
          .select('id, provincia_id')
          .eq('id', circ.municipio_id)
          .single();

        if (!mun) return;
        setMunicipioId(mun.id);
        setProvinciaId(mun.provincia_id);
      } catch {
        // Silently fail
      } finally {
        setLoadingGeo(false);
      }
    }

    loadGeo();
  }, [member]);

  // Initialize coordinator
  useEffect(() => {
    if (member?.coordinador_id) {
      setCoordinadorId(member.coordinador_id);
    }
  }, [member]);

  // Initialize photo preview
  useEffect(() => {
    if (member?.foto_url) {
      setPhotoPreview(member.foto_url);
    }
  }, [member]);

  // Fetch provincias on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('provincias')
        .select('id, nombre')
        .eq('estado', true)
        .order('nombre');
      setProvincias(data ?? []);
    }
    load();
  }, []);

  // Fetch municipios
  useEffect(() => {
    if (!provinciaId) {
      setMunicipios([]);
      return;
    }
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('municipios')
        .select('id, nombre')
        .eq('provincia_id', provinciaId)
        .eq('estado', true)
        .order('nombre');
      setMunicipios(data ?? []);
    }
    load();
  }, [provinciaId]);

  // Fetch circunscripciones
  useEffect(() => {
    if (!municipioId) {
      setCircunscripciones([]);
      return;
    }
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('circunscripciones')
        .select('id, nombre')
        .eq('municipio_id', municipioId)
        .eq('estado', true)
        .order('nombre');
      setCircunscripciones(data ?? []);
    }
    load();
  }, [municipioId]);

  // Fetch sectores
  useEffect(() => {
    if (!circunscripcionId) {
      setSectores([]);
      return;
    }
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('sectores')
        .select('id, nombre')
        .eq('circunscripcion_id', circunscripcionId)
        .eq('estado', true)
        .order('nombre');
      setSectores(data ?? []);
    }
    load();
  }, [circunscripcionId]);

  // Cascade clears
  const handleProvinciaChange = useCallback(
    (val: string) => {
      setProvinciaId(val);
      setMunicipioId('');
      setCircunscripcionId('');
      setSectorId('');
    },
    []
  );

  const handleMunicipioChange = useCallback(
    (val: string) => {
      setMunicipioId(val);
      setCircunscripcionId('');
      setSectorId('');
    },
    []
  );

  const handleCircunscripcionChange = useCallback(
    (val: string) => {
      setCircunscripcionId(val);
      setSectorId('');
    },
    []
  );

  // Photo handling
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setApiError('La foto no debe superar 5MB.');
      return;
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setApiError('Solo se permiten imagenes JPEG, PNG o WebP.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setApiError(null);
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  // Submit handler
  async function onFormSubmit(values: MemberFormValues) {
    setSubmitting(true);
    setApiError(null);

    try {
      let fotoUrl: string | null = member?.foto_url ?? null;

      // Upload photo if new file selected
      if (photoFile) {
        const supabase = createClient();
        const ext = photoFile.name.split('.').pop();
        const fileName = `miembros/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos')
          .upload(fileName, photoFile, { upsert: true });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('fotos').getPublicUrl(fileName);
          fotoUrl = publicUrl;
        }
        // If upload fails, continue without photo -- non-blocking
      }

      const redesSociales: RedesSociales = {};
      if (values.facebook) redesSociales.facebook = values.facebook;
      if (values.twitter) redesSociales.twitter = values.twitter;
      if (values.instagram) redesSociales.instagram = values.instagram;

      const data: CreateMemberData = {
        cedula: stripCedula(values.cedula),
        nombre: values.nombre.trim(),
        apellido: values.apellido.trim(),
        tipo_miembro: values.tipo_miembro as MemberType,
        apodo: values.apodo || null,
        sexo: values.sexo || null,
        fecha_nacimiento: values.fecha_nacimiento || null,
        ocupacion: values.ocupacion || null,
        telefono: values.telefono || null,
        celular: values.celular || null,
        email: values.email || null,
        direccion: values.direccion || null,
        redes_sociales: redesSociales,
        sector_id: sectorId || null,
        coordinador_id: needsCoordinator ? coordinadorId : null,
        foto_url: fotoUrl,
      };

      await onSubmit(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error inesperado. Intenta nuevamente.';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Cedula auto-format
  function handleCedulaChange(
    e: React.ChangeEvent<HTMLInputElement>,
    fieldOnChange: (value: string) => void
  ) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) {
      fieldOnChange(raw);
    } else if (raw.length <= 10) {
      fieldOnChange(`${raw.slice(0, 3)}-${raw.slice(3)}`);
    } else {
      fieldOnChange(
        `${raw.slice(0, 3)}-${raw.slice(3, 10)}-${raw.slice(10)}`
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="space-y-8"
      noValidate
    >
      {/* Section 1: Datos Personales */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-primary-text">
          Datos Personales
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Cedula */}
          <div className="space-y-1.5">
            <Label htmlFor="member-cedula">
              Cedula <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="cedula"
              control={control}
              render={({ field }) => (
                <Input
                  id="member-cedula"
                  placeholder="000-0000000-0"
                  className="font-mono"
                  value={field.value}
                  onChange={(e) => handleCedulaChange(e, field.onChange)}
                  onBlur={field.onBlur}
                  aria-invalid={!!errors.cedula}
                  aria-describedby={
                    errors.cedula ? 'member-cedula-error' : undefined
                  }
                />
              )}
            />
            {errors.cedula && (
              <p
                id="member-cedula-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.cedula.message}
              </p>
            )}
          </div>

          {/* Tipo de miembro */}
          <div className="space-y-1.5">
            <Label htmlFor="member-tipo">
              Tipo de miembro <span className="text-destructive">*</span>
            </Label>
            <SelectNative
              id="member-tipo"
              aria-invalid={!!errors.tipo_miembro}
              aria-describedby={
                errors.tipo_miembro ? 'member-tipo-error' : undefined
              }
              {...register('tipo_miembro')}
            >
              <option value="" disabled>
                Seleccionar tipo
              </option>
              {(
                Object.keys(TIPO_MIEMBRO_LABELS) as MemberType[]
              ).map((key) => (
                <option key={key} value={key}>
                  {TIPO_MIEMBRO_LABELS[key]}
                </option>
              ))}
            </SelectNative>
            {errors.tipo_miembro && (
              <p
                id="member-tipo-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.tipo_miembro.message}
              </p>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="member-nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="member-nombre"
              placeholder="Nombre"
              aria-invalid={!!errors.nombre}
              aria-describedby={
                errors.nombre ? 'member-nombre-error' : undefined
              }
              {...register('nombre')}
            />
            {errors.nombre && (
              <p
                id="member-nombre-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.nombre.message}
              </p>
            )}
          </div>

          {/* Apellido */}
          <div className="space-y-1.5">
            <Label htmlFor="member-apellido">
              Apellido <span className="text-destructive">*</span>
            </Label>
            <Input
              id="member-apellido"
              placeholder="Apellido"
              aria-invalid={!!errors.apellido}
              aria-describedby={
                errors.apellido ? 'member-apellido-error' : undefined
              }
              {...register('apellido')}
            />
            {errors.apellido && (
              <p
                id="member-apellido-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.apellido.message}
              </p>
            )}
          </div>

          {/* Apodo */}
          <div className="space-y-1.5">
            <Label htmlFor="member-apodo">Apodo</Label>
            <Input
              id="member-apodo"
              placeholder="Apodo o sobrenombre"
              {...register('apodo')}
            />
          </div>

          {/* Sexo */}
          <div className="space-y-1.5">
            <Label htmlFor="member-sexo">Sexo</Label>
            <SelectNative id="member-sexo" {...register('sexo')}>
              <option value="">Seleccionar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </SelectNative>
          </div>

          {/* Fecha de nacimiento */}
          <div className="space-y-1.5">
            <Label htmlFor="member-nacimiento">Fecha de nacimiento</Label>
            <Input
              id="member-nacimiento"
              type="date"
              {...register('fecha_nacimiento')}
            />
          </div>

          {/* Ocupacion */}
          <div className="space-y-1.5">
            <Label htmlFor="member-ocupacion">Ocupacion</Label>
            <Input
              id="member-ocupacion"
              placeholder="Ocupacion"
              {...register('ocupacion')}
            />
          </div>
        </div>
      </fieldset>

      {/* Section 2: Informacion de Contacto */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-primary-text">
          Informacion de Contacto
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Telefono */}
          <div className="space-y-1.5">
            <Label htmlFor="member-telefono">Telefono</Label>
            <Input
              id="member-telefono"
              type="tel"
              placeholder="809-000-0000"
              {...register('telefono')}
            />
          </div>

          {/* Celular */}
          <div className="space-y-1.5">
            <Label htmlFor="member-celular">Celular</Label>
            <Input
              id="member-celular"
              type="tel"
              placeholder="829-000-0000"
              {...register('celular')}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="member-email">Correo electronico</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="correo@ejemplo.com"
              aria-invalid={!!errors.email}
              aria-describedby={
                errors.email ? 'member-email-error' : undefined
              }
              {...register('email')}
            />
            {errors.email && (
              <p
                id="member-email-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Direccion */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="member-direccion">Direccion</Label>
            <Input
              id="member-direccion"
              placeholder="Direccion completa"
              {...register('direccion')}
            />
          </div>
        </div>
      </fieldset>

      {/* Section 3: Redes Sociales (collapsible) */}
      <fieldset className="space-y-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowSocial(!showSocial)}
          aria-expanded={showSocial}
          aria-controls="social-fields"
        >
          <legend className="text-lg font-semibold text-primary-text">
            Redes Sociales
          </legend>
          {showSocial ? (
            <ChevronUp
              size={20}
              className="text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              size={20}
              className="text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </button>

        {showSocial && (
          <div id="social-fields" className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="member-facebook">Facebook</Label>
              <Input
                id="member-facebook"
                placeholder="Perfil de Facebook"
                {...register('facebook')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-twitter">Twitter / X</Label>
              <Input
                id="member-twitter"
                placeholder="@usuario"
                {...register('twitter')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-instagram">Instagram</Label>
              <Input
                id="member-instagram"
                placeholder="@usuario"
                {...register('instagram')}
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* Section 4: Ubicacion Geografica */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-primary-text">
          Asignacion Geografica
        </legend>

        {loadingGeo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando ubicacion...
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Provincia */}
          <div className="space-y-1.5">
            <Label htmlFor="member-provincia">Provincia</Label>
            <SelectNative
              id="member-provincia"
              value={provinciaId}
              onChange={(e) => handleProvinciaChange(e.target.value)}
            >
              <option value="">Seleccionar provincia</option>
              {provincias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </SelectNative>
          </div>

          {/* Municipio */}
          <div className="space-y-1.5">
            <Label htmlFor="member-municipio">Municipio</Label>
            <SelectNative
              id="member-municipio"
              value={municipioId}
              onChange={(e) => handleMunicipioChange(e.target.value)}
              disabled={!provinciaId}
            >
              <option value="">Seleccionar municipio</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </SelectNative>
          </div>

          {/* Circunscripcion */}
          {municipioId && (
            <div className="space-y-1.5">
              <Label htmlFor="member-circunscripcion">Circunscripcion</Label>
              <SelectNative
                id="member-circunscripcion"
                value={circunscripcionId}
                onChange={(e) => handleCircunscripcionChange(e.target.value)}
              >
                <option value="">Seleccionar circunscripcion</option>
                {circunscripciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </SelectNative>
            </div>
          )}

          {/* Sector */}
          {circunscripcionId && (
            <div className="space-y-1.5">
              <Label htmlFor="member-sector">Sector</Label>
              <SelectNative
                id="member-sector"
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
              >
                <option value="">Seleccionar sector</option>
                {sectores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </SelectNative>
            </div>
          )}
        </div>
      </fieldset>

      {/* Section 5: Asignacion Organizacional */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-primary-text">
          Asignacion Organizacional
        </legend>

        {needsCoordinator && (
          <div className="space-y-1.5">
            <Label htmlFor="member-coordinador">Coordinador asignado</Label>
            <CoordinatorSelect
              id="member-coordinador"
              value={coordinadorId}
              onChange={setCoordinadorId}
            />
            <p className="text-xs text-muted-foreground">
              Busca y selecciona el coordinador responsable de este miembro.
            </p>
          </div>
        )}

        {!needsCoordinator && tipoMiembro === 'coordinador' && (
          <p className="text-sm text-muted-foreground">
            Los coordinadores no requieren asignacion a otro coordinador.
          </p>
        )}

        {!tipoMiembro && (
          <p className="text-sm text-muted-foreground">
            Selecciona un tipo de miembro primero.
          </p>
        )}
      </fieldset>

      {/* Section 6: Foto */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-primary-text">
          Foto del Miembro
        </legend>

        <div className="flex items-start gap-4">
          {/* Preview */}
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-neutral-50">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Vista previa de la foto"
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle
                size={40}
                strokeWidth={1}
                className="text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="photo-upload"
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent',
                  submitting && 'pointer-events-none opacity-50'
                )}
              >
                <Upload size={16} aria-hidden="true" />
                {photoPreview ? 'Cambiar foto' : 'Subir foto'}
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="sr-only"
                disabled={submitting}
              />
              {photoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  disabled={submitting}
                >
                  <X size={14} className="mr-1" aria-hidden="true" />
                  Quitar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG o WebP. Maximo 5MB.
            </p>
          </div>
        </div>
      </fieldset>

      {/* API Error */}
      {apiError && (
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-destructive">{apiError}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && (
            <Loader2
              className="mr-2 h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          )}
          {submitLabel ?? (isEdit ? 'Guardar Cambios' : 'Registrar Miembro')}
        </Button>
      </div>
    </form>
  );
}
