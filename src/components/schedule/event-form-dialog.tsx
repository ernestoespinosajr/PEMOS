'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { RecurrenceSelector } from './recurrence-selector';
import { createClient } from '@/lib/supabase/client';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type EventCategory,
  type EventPriority,
  type RecurrencePattern,
  type ScheduleEvent,
  type CreateEventData,
  type UpdateEventData,
} from '@/types/schedule';

// ---------- Geo Option ----------

interface GeoOption {
  id: string;
  nombre: string;
}

// ---------- User Option ----------

interface UserOption {
  id: string;
  nombre: string;
  apellido: string;
}

// ---------- Zod Schema ----------

const eventFormBaseSchema = z.object({
  titulo: z.string().min(1, 'El titulo es requerido'),
  descripcion: z.string().optional().default(''),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fecha_fin: z.string().min(1, 'La fecha de fin es requerida'),
  todo_el_dia: z.boolean().default(false),
  categoria: z.string().min(1, 'La categoria es requerida'),
  prioridad: z.string().min(1, 'La prioridad es requerida'),
  responsable_id: z.string().optional().default(''),
  nivel_geografico: z.string().optional().default(''),
  nivel_id: z.string().optional().default(''),
  color: z.string().optional().default(''),
});

const eventFormSchema = eventFormBaseSchema.refine(
  (data) => {
    if (!data.fecha_inicio || !data.fecha_fin) return true;
    return new Date(data.fecha_fin) >= new Date(data.fecha_inicio);
  },
  {
    message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
    path: ['fecha_fin'],
  }
);

type EventFormValues = z.infer<typeof eventFormBaseSchema>;

// ---------- Props ----------

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing event for edit mode. Null = create mode. */
  event?: ScheduleEvent | null;
  /** Pre-filled start date (from clicking a calendar date). */
  defaultDate?: string;
  onSubmit: (
    data: CreateEventData | UpdateEventData
  ) => Promise<boolean>;
}

// ---------- Component ----------

/**
 * Modal dialog for creating and editing schedule events.
 *
 * Fields organized in sections:
 * - Event details (title, description, dates, category, priority)
 * - Assignment (responsible user)
 * - Geographic scope (cascading selectors)
 * - Recurrence (collapsible)
 * - Color (optional)
 *
 * All labels in Spanish. Validation with Zod + React Hook Form.
 */
export function EventFormDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  onSubmit,
}: EventFormDialogProps) {
  const isEdit = !!event;
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Recurrence (managed outside RHF due to complex structure)
  const [recurrence, setRecurrence] = useState<RecurrencePattern | null>(
    event?.patron_recurrencia ?? null
  );

  // Geographic cascading state
  const [provinciaId, setProvinciaId] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [circunscripcionId, setCircunscripcionId] = useState('');
  const [sectorId, setSectorId] = useState('');

  // Geo data
  const [provincias, setProvincias] = useState<GeoOption[]>([]);
  const [municipios, setMunicipios] = useState<GeoOption[]>([]);
  const [circunscripciones, setCircunscripciones] = useState<GeoOption[]>([]);
  const [sectores, setSectores] = useState<GeoOption[]>([]);

  // Users
  const [users, setUsers] = useState<UserOption[]>([]);

  // Default date formatting helper
  function toDateTimeLocal(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  function toDateOnly(iso: string): string {
    if (!iso) return '';
    return iso.slice(0, 10);
  }

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: {
      titulo: event?.titulo ?? '',
      descripcion: event?.descripcion ?? '',
      fecha_inicio: event
        ? toDateTimeLocal(event.fecha_inicio)
        : defaultDate
          ? `${toDateOnly(defaultDate)}T09:00`
          : '',
      fecha_fin: event
        ? toDateTimeLocal(event.fecha_fin)
        : defaultDate
          ? `${toDateOnly(defaultDate)}T17:00`
          : '',
      todo_el_dia: event?.todo_el_dia ?? false,
      categoria: event?.categoria ?? '',
      prioridad: event?.prioridad ?? 'media',
      responsable_id: event?.responsable_id ?? '',
      nivel_geografico: event?.nivel_geografico ?? '',
      nivel_id: event?.nivel_id ?? '',
      color: event?.color ?? '',
    },
  });

  const todoElDia = watch('todo_el_dia');

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    if (open) {
      reset({
        titulo: event?.titulo ?? '',
        descripcion: event?.descripcion ?? '',
        fecha_inicio: event
          ? toDateTimeLocal(event.fecha_inicio)
          : defaultDate
            ? `${toDateOnly(defaultDate)}T09:00`
            : '',
        fecha_fin: event
          ? toDateTimeLocal(event.fecha_fin)
          : defaultDate
            ? `${toDateOnly(defaultDate)}T17:00`
            : '',
        todo_el_dia: event?.todo_el_dia ?? false,
        categoria: event?.categoria ?? '',
        prioridad: event?.prioridad ?? 'media',
        responsable_id: event?.responsable_id ?? '',
        nivel_geografico: event?.nivel_geografico ?? '',
        nivel_id: event?.nivel_id ?? '',
        color: event?.color ?? '',
      });
      setRecurrence(event?.patron_recurrencia ?? null);
      setApiError(null);
    }
  }, [open, event, defaultDate, reset]);

  // Fetch users on mount
  useEffect(() => {
    if (!open) return;
    async function loadUsers() {
      const supabase = createClient();
      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido')
        .eq('estado', true)
        .order('nombre');
      setUsers(data ?? []);
    }
    loadUsers();
  }, [open]);

  // Fetch provincias on mount
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  // Cascading geo fetches
  useEffect(() => {
    if (!provinciaId) { setMunicipios([]); return; }
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

  useEffect(() => {
    if (!municipioId) { setCircunscripciones([]); return; }
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

  useEffect(() => {
    if (!circunscripcionId) { setSectores([]); return; }
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
  const handleProvinciaChange = useCallback((val: string) => {
    setProvinciaId(val);
    setMunicipioId('');
    setCircunscripcionId('');
    setSectorId('');
  }, []);

  const handleMunicipioChange = useCallback((val: string) => {
    setMunicipioId(val);
    setCircunscripcionId('');
    setSectorId('');
  }, []);

  const handleCircunscripcionChange = useCallback((val: string) => {
    setCircunscripcionId(val);
    setSectorId('');
  }, []);

  // Derive nivel_geografico + nivel_id from cascading selectors
  function resolveGeo(): { nivel_geografico: string | null; nivel_id: string | null } {
    if (sectorId) return { nivel_geografico: 'sector', nivel_id: sectorId };
    if (circunscripcionId) return { nivel_geografico: 'circunscripcion', nivel_id: circunscripcionId };
    if (municipioId) return { nivel_geografico: 'municipio', nivel_id: municipioId };
    if (provinciaId) return { nivel_geografico: 'provincia', nivel_id: provinciaId };
    return { nivel_geografico: null, nivel_id: null };
  }

  // Submit handler
  async function onFormSubmit(values: EventFormValues) {
    setSubmitting(true);
    setApiError(null);

    try {
      const geo = resolveGeo();

      const payload: CreateEventData = {
        titulo: values.titulo.trim(),
        descripcion: values.descripcion || null,
        responsable_id: values.responsable_id || null,
        fecha_inicio: new Date(values.fecha_inicio).toISOString(),
        fecha_fin: new Date(values.fecha_fin).toISOString(),
        todo_el_dia: values.todo_el_dia,
        categoria: values.categoria as EventCategory,
        prioridad: values.prioridad as EventPriority,
        color: values.color || null,
        nivel_geografico: geo.nivel_geografico,
        nivel_id: geo.nivel_id,
        es_recurrente: !!recurrence,
        patron_recurrencia: recurrence,
      };

      let success: boolean;
      if (isEdit && event) {
        success = await onSubmit({ ...payload, id: event.id } as UpdateEventData);
      } else {
        success = await onSubmit(payload);
      }

      if (success) {
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error inesperado. Intenta nuevamente.';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Actividad' : 'Nueva Actividad'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los detalles de la actividad del cronograma.'
              : 'Completa los campos para agregar una nueva actividad al cronograma.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="space-y-6"
          noValidate
        >
          {/* Section: Detalles */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-primary-text">
              Detalles del Evento
            </legend>

            {/* Titulo */}
            <div className="space-y-1.5">
              <Label htmlFor="event-titulo">
                Titulo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="event-titulo"
                placeholder="Titulo de la actividad"
                aria-invalid={!!errors.titulo}
                aria-describedby={errors.titulo ? 'event-titulo-error' : undefined}
                {...register('titulo')}
              />
              {errors.titulo && (
                <p id="event-titulo-error" className="flex items-center gap-1 text-xs text-destructive" role="alert">
                  <AlertCircle size={12} aria-hidden="true" />
                  {errors.titulo.message}
                </p>
              )}
            </div>

            {/* Descripcion */}
            <div className="space-y-1.5">
              <Label htmlFor="event-descripcion">Descripcion</Label>
              <textarea
                id="event-descripcion"
                rows={3}
                placeholder="Descripcion de la actividad (opcional)"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                {...register('descripcion')}
              />
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event-inicio">
                  Fecha de inicio <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="event-inicio"
                  type={todoElDia ? 'date' : 'datetime-local'}
                  aria-invalid={!!errors.fecha_inicio}
                  aria-describedby={errors.fecha_inicio ? 'event-inicio-error' : undefined}
                  {...register('fecha_inicio')}
                />
                {errors.fecha_inicio && (
                  <p id="event-inicio-error" className="flex items-center gap-1 text-xs text-destructive" role="alert">
                    <AlertCircle size={12} aria-hidden="true" />
                    {errors.fecha_inicio.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event-fin">
                  Fecha de fin <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="event-fin"
                  type={todoElDia ? 'date' : 'datetime-local'}
                  aria-invalid={!!errors.fecha_fin}
                  aria-describedby={errors.fecha_fin ? 'event-fin-error' : undefined}
                  {...register('fecha_fin')}
                />
                {errors.fecha_fin && (
                  <p id="event-fin-error" className="flex items-center gap-1 text-xs text-destructive" role="alert">
                    <AlertCircle size={12} aria-hidden="true" />
                    {errors.fecha_fin.message}
                  </p>
                )}
              </div>
            </div>

            {/* Todo el dia */}
            <div className="flex items-center gap-2">
              <input
                id="event-allday"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                {...register('todo_el_dia')}
              />
              <Label htmlFor="event-allday" className="cursor-pointer">
                Todo el dia
              </Label>
            </div>

            {/* Category + Priority */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event-categoria">
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <SelectNative
                  id="event-categoria"
                  aria-invalid={!!errors.categoria}
                  aria-describedby={errors.categoria ? 'event-cat-error' : undefined}
                  {...register('categoria')}
                >
                  <option value="" disabled>
                    Seleccionar categoria
                  </option>
                  {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {CATEGORY_LABELS[key]}
                      </option>
                    )
                  )}
                </SelectNative>
                {errors.categoria && (
                  <p id="event-cat-error" className="flex items-center gap-1 text-xs text-destructive" role="alert">
                    <AlertCircle size={12} aria-hidden="true" />
                    {errors.categoria.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event-prioridad">
                  Prioridad <span className="text-destructive">*</span>
                </Label>
                <SelectNative
                  id="event-prioridad"
                  aria-invalid={!!errors.prioridad}
                  {...register('prioridad')}
                >
                  {(Object.keys(PRIORITY_LABELS) as EventPriority[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {PRIORITY_LABELS[key]}
                      </option>
                    )
                  )}
                </SelectNative>
              </div>
            </div>
          </fieldset>

          {/* Section: Asignacion */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-primary-text">
              Asignacion
            </legend>

            <div className="space-y-1.5">
              <Label htmlFor="event-responsable">Responsable</Label>
              <SelectNative
                id="event-responsable"
                {...register('responsable_id')}
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido}
                  </option>
                ))}
              </SelectNative>
            </div>
          </fieldset>

          {/* Section: Alcance Geografico */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-primary-text">
              Alcance Geografico
            </legend>
            <p className="text-xs text-secondary-text">
              Opcional. Si no se selecciona, la actividad sera visible para todos.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event-provincia">Provincia</Label>
                <SelectNative
                  id="event-provincia"
                  value={provinciaId}
                  onChange={(e) => handleProvinciaChange(e.target.value)}
                >
                  <option value="">Todas</option>
                  {provincias.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event-municipio">Municipio</Label>
                <SelectNative
                  id="event-municipio"
                  value={municipioId}
                  onChange={(e) => handleMunicipioChange(e.target.value)}
                  disabled={!provinciaId}
                >
                  <option value="">Todos</option>
                  {municipios.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </SelectNative>
              </div>

              {municipioId && (
                <div className="space-y-1.5">
                  <Label htmlFor="event-circ">Circunscripcion</Label>
                  <SelectNative
                    id="event-circ"
                    value={circunscripcionId}
                    onChange={(e) => handleCircunscripcionChange(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {circunscripciones.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              )}

              {circunscripcionId && (
                <div className="space-y-1.5">
                  <Label htmlFor="event-sector">Sector</Label>
                  <SelectNative
                    id="event-sector"
                    value={sectorId}
                    onChange={(e) => setSectorId(e.target.value)}
                  >
                    <option value="">Todos</option>
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

          {/* Section: Recurrence */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-primary-text">
              Recurrencia
            </legend>
            <RecurrenceSelector
              value={recurrence}
              onChange={setRecurrence}
              disabled={submitting}
            />
          </fieldset>

          {/* Section: Color (optional) */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-primary-text">
              Color personalizado
            </legend>
            <p className="text-xs text-secondary-text">
              Opcional. Si no se especifica, se usara el color de la categoria.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="event-color"
                type="color"
                className="h-9 w-12 cursor-pointer rounded-md border border-input"
                {...register('color')}
              />
              <Label htmlFor="event-color" className="cursor-pointer text-sm">
                Seleccionar color
              </Label>
            </div>
          </fieldset>

          {/* API Error */}
          {apiError && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
              role="alert"
              aria-live="polite"
            >
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle size={16} aria-hidden="true" />
                {apiError}
              </p>
            </div>
          )}

          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
              {isEdit ? 'Guardar Cambios' : 'Crear Actividad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
