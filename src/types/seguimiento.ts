/**
 * Types for the Unregistered Voter Tracking feature (ftr-009).
 *
 * Covers: padron_externo, seguimiento_no_inscritos, historial,
 * plantillas_llamada, follow-up queue, and conversion reporting.
 */

// ---------- Constants ----------

export const PAGE_SIZE_SEGUIMIENTO = 25;

export const ESTADO_LABELS: Record<string, string> = {
  no_contactado: 'No Contactado',
  contactado: 'Contactado',
  seguimiento_programado: 'Seguimiento Programado',
  registrado: 'Registrado',
  rechazado: 'Rechazado',
};

export const ESTADO_COLORS: Record<string, string> = {
  no_contactado: 'bg-neutral-100 text-neutral-700',
  contactado: 'bg-blue-100 text-blue-800',
  seguimiento_programado: 'bg-amber-100 text-amber-800',
  registrado: 'bg-emerald-100 text-emerald-800',
  rechazado: 'bg-red-100 text-red-800',
};

export const CONTACTO_OPTIONS = [
  { value: 'SI', label: 'Si' },
  { value: 'NO', label: 'No' },
] as const;

export const DECISION_OPTIONS = [
  { value: 'SI', label: 'Si' },
  { value: 'NO', label: 'No' },
  { value: 'INDECISO', label: 'Indeciso' },
] as const;

export type SeguimientoEstado =
  | 'no_contactado'
  | 'contactado'
  | 'seguimiento_programado'
  | 'registrado'
  | 'rechazado';

// ---------- Padron Externo ----------

export interface PadronExternoRecord {
  id: string;
  cedula: string;
  nombres: string | null;
  apellidos: string | null;
  sexo: string | null;
  edad: number | null;
  colegio: string | null;
  cod_recinto: string | null;
  nombre_recinto: string | null;
  direccion_recinto: string | null;
  cod_comite_intermedio: string | null;
  comite_intermedio: string | null;
  comite_de_base: string | null;
  telefonos: string | null;
  telefonos_alt: string | null;
  direccion_residencia: string | null;
  sector_residencia: string | null;
  partido_id: string;
  created_at: string;
}

// ---------- Seguimiento Record ----------

export interface SeguimientoRecord {
  id: string;
  cedula: string;
  colegio: string | null;
  recinto_id: string | null;
  cod_recinto: string | null;
  contacto: string | null;
  decision_voto: string | null;
  decision_presidente: string | null;
  comentario: string | null;
  estado: SeguimientoEstado;
  fecha_proximo_seguimiento: string | null;
  fecha_conversion: string | null;
  miembro_id: string | null;
  usuario_id: string;
  terminal: string | null;
  partido_id: string;
  created_at: string;
  updated_at: string;
}

// ---------- Historial ----------

export interface SeguimientoHistorialRecord {
  id: string;
  seguimiento_id: string;
  contacto: string | null;
  decision_voto: string | null;
  decision_presidente: string | null;
  comentario: string | null;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  usuario_id: string;
  created_at: string;
  /** Resolved from usuarios join */
  usuario_nombre?: string | null;
  usuario_apellido?: string | null;
}

// ---------- Follow-Up Queue Item ----------

export interface FollowupQueueItem {
  padron_id: string;
  cedula: string;
  nombres: string | null;
  apellidos: string | null;
  telefonos: string | null;
  colegio: string | null;
  cod_recinto: string | null;
  nombre_recinto: string | null;
  direccion_recinto: string | null;
  seguimiento_id: string | null;
  estado: SeguimientoEstado;
  contacto: string | null;
  decision_voto: string | null;
  decision_presidente: string | null;
  comentario: string | null;
  fecha_proximo_seguimiento: string | null;
  recinto_id: string | null;
  es_vencido: boolean;
  total_count: number;
}

// ---------- Plantilla Llamada ----------

export interface PlantillaLlamada {
  id: string;
  nombre: string;
  contenido: string;
  activa: boolean;
  partido_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePlantillaData {
  nombre: string;
  contenido: string;
  activa?: boolean;
}

export interface UpdatePlantillaData {
  nombre?: string;
  contenido?: string;
  activa?: boolean;
}

// ---------- Form Data ----------

export interface CreateSeguimientoData {
  cedula: string;
  colegio?: string | null;
  recinto_id?: string | null;
  cod_recinto?: string | null;
  contacto: string;
  decision_voto?: string | null;
  decision_presidente?: string | null;
  comentario?: string | null;
  estado: SeguimientoEstado;
  fecha_proximo_seguimiento?: string | null;
}

export interface UpdateSeguimientoData {
  contacto?: string;
  decision_voto?: string | null;
  decision_presidente?: string | null;
  comentario?: string | null;
  estado?: SeguimientoEstado;
  fecha_proximo_seguimiento?: string | null;
  fecha_conversion?: string | null;
  miembro_id?: string | null;
}

// ---------- Conversion Rates ----------

export interface ConversionRateRow {
  area_id: string | null;
  area_nombre: string | null;
  total: number;
  contactados: number;
  registrados: number;
  rechazados: number;
  pendientes: number;
  tasa_conversion: number;
}

// ---------- Filters ----------

export interface SeguimientoFilters {
  search: string;
  estado: SeguimientoEstado | '';
  recinto_id: string;
  page: number;
}

export const DEFAULT_SEGUIMIENTO_FILTERS: SeguimientoFilters = {
  search: '',
  estado: '',
  recinto_id: '',
  page: 1,
};

// ---------- Conversion Report Filters ----------

export interface ConversionReportFilters {
  area_type: 'provincia' | 'municipio' | 'circunscripcion' | 'recinto' | '';
  area_id: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export const DEFAULT_CONVERSION_FILTERS: ConversionReportFilters = {
  area_type: '',
  area_id: '',
  fecha_inicio: '',
  fecha_fin: '',
};
