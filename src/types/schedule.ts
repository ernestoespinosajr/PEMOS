/**
 * Types for the Schedule Management feature (ftr-010).
 *
 * Covers: cronograma actividades, tareas, recurrence patterns,
 * category colors, and FullCalendar event format.
 */

// ---------- Constants ----------

export const PAGE_SIZE_SCHEDULE = 20;

// ---------- Categories ----------

export type EventCategory =
  | 'reunion'
  | 'capacitacion'
  | 'operativo'
  | 'electoral'
  | 'administrativo'
  | 'otro';

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  reunion: 'Reunion',
  capacitacion: 'Capacitacion',
  operativo: 'Operativo',
  electoral: 'Electoral',
  administrativo: 'Administrativo',
  otro: 'Otro',
};

/**
 * Category-to-color map for calendar event blocks.
 * Each entry provides a background, text, and border color
 * suitable for FullCalendar rendering and badge display.
 */
export const CATEGORY_COLORS: Record<
  EventCategory,
  { bg: string; text: string; border: string; dot: string }
> = {
  reunion: {
    bg: '#DBEAFE',
    text: '#1E40AF',
    border: '#2563EB',
    dot: '#2563EB',
  },
  capacitacion: {
    bg: '#EDE9FE',
    text: '#5B21B6',
    border: '#7C3AED',
    dot: '#7C3AED',
  },
  operativo: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#D97706',
    dot: '#D97706',
  },
  electoral: {
    bg: '#D8F3DC',
    text: '#1B4332',
    border: '#2D6A4F',
    dot: '#2D6A4F',
  },
  administrativo: {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#6B7280',
    dot: '#6B7280',
  },
  otro: {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#9CA3AF',
    dot: '#9CA3AF',
  },
};

// ---------- Priority ----------

export type EventPriority = 'alta' | 'media' | 'baja';

export const PRIORITY_LABELS: Record<EventPriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const PRIORITY_COLORS: Record<
  EventPriority,
  { bg: string; text: string }
> = {
  alta: { bg: 'bg-red-50 text-red-700', text: 'text-red-700' },
  media: { bg: 'bg-yellow-50 text-yellow-700', text: 'text-yellow-700' },
  baja: { bg: 'bg-green-50 text-green-700', text: 'text-green-700' },
};

// ---------- Status ----------

export type EventStatus = 'planificado' | 'en_progreso' | 'completado' | 'cancelado' | 'activo';

export const STATUS_LABELS: Record<EventStatus, string> = {
  planificado: 'Planificado',
  en_progreso: 'En Progreso',
  completado: 'Completado',
  cancelado: 'Cancelado',
  activo: 'Activo',
};

export const STATUS_COLORS: Record<
  EventStatus,
  { bg: string; text: string }
> = {
  planificado: { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700' },
  en_progreso: { bg: 'bg-yellow-50 text-yellow-700', text: 'text-yellow-700' },
  completado: { bg: 'bg-green-50 text-green-700', text: 'text-green-700' },
  cancelado: { bg: 'bg-red-50 text-red-700', text: 'text-red-700' },
  activo: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700' },
};

// ---------- Recurrence ----------

export type RecurrenceFrequency = 'diario' | 'semanal' | 'mensual' | 'anual';

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  mensual: 'Mensual',
  anual: 'Anual',
};

export const DAYS_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mie',
  4: 'Jue',
  5: 'Vie',
  6: 'Sab',
};

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  days_of_week?: number[];
  end_date?: string;
  occurrences?: number;
}

// ---------- Schedule Event (Activity) ----------

export interface ScheduleEvent {
  id: string;
  titulo: string;
  descripcion: string | null;
  responsable_id: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  todo_el_dia: boolean;
  categoria: EventCategory;
  prioridad: EventPriority;
  estado: EventStatus;
  color: string | null;
  // Geographic association (polymorphic)
  nivel_geografico: string | null;
  nivel_id: string | null;
  // Recurrence
  es_recurrente: boolean;
  patron_recurrencia: RecurrencePattern | null;
  recurrencia_padre_id: string | null;
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  responsable_nombre?: string | null;
  tareas?: ScheduleTask[];
  tareas_completadas?: number;
  tareas_total?: number;
}

// ---------- Schedule Task ----------

export interface ScheduleTask {
  id: string;
  cronograma_id: string;
  titulo: string;
  descripcion: string | null;
  asignado_a: string | null;
  fecha_limite: string | null;
  completada: boolean;
  orden: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  // Joined
  asignado_nombre?: string | null;
}

// ---------- Create / Update DTOs ----------

export interface CreateEventData {
  titulo: string;
  descripcion?: string | null;
  responsable_id?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  todo_el_dia?: boolean;
  categoria: EventCategory;
  prioridad: EventPriority;
  estado?: EventStatus;
  color?: string | null;
  nivel_geografico?: string | null;
  nivel_id?: string | null;
  es_recurrente?: boolean;
  patron_recurrencia?: RecurrencePattern | null;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

export interface CreateTaskData {
  cronograma_id: string;
  titulo: string;
  descripcion?: string | null;
  asignado_a?: string | null;
  fecha_limite?: string | null;
  orden?: number;
}

export interface UpdateTaskData {
  id: string;
  titulo?: string;
  descripcion?: string | null;
  asignado_a?: string | null;
  fecha_limite?: string | null;
  completada?: boolean;
  orden?: number;
}

// ---------- Filters ----------

export interface ScheduleFilters {
  categoria?: EventCategory | '';
  prioridad?: EventPriority | '';
  estado?: EventStatus | '';
  search?: string;
}

// ---------- View Toggle ----------

export type ScheduleView = 'calendario' | 'proximos' | 'historial';
