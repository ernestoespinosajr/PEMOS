/**
 * Types for the Member Management feature (ftr-005).
 *
 * Based on the actual `miembros` table in Supabase:
 * - nombre + apellido (separate fields)
 * - cedula (11-digit Dominican ID)
 * - tipo_miembro enum: coordinador | multiplicador | relacionado
 * - sector_id links to geographic hierarchy (sector -> circunscripcion -> municipio -> provincia)
 * - coordinador_id is a self-referencing FK
 * - redes_sociales is a JSON field
 */

import type { Database } from '../../types/supabase';

// ---------- DB Row Types ----------

export type MiembroRow = Database['public']['Tables']['miembros']['Row'];
export type MiembroInsert = Database['public']['Tables']['miembros']['Insert'];
export type MiembroUpdate = Database['public']['Tables']['miembros']['Update'];

// ---------- Enum ----------

export type MemberType = Database['public']['Enums']['tipo_miembro'];

// ---------- Social Networks JSON shape ----------

export interface RedesSociales {
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

// ---------- Full Member Record ----------

/** Full member record as stored in the database. */
export interface Member {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  apodo: string | null;
  tipo_miembro: MemberType;
  sexo: string | null;
  fecha_nacimiento: string | null;
  ocupacion: string | null;
  trabajo: string | null;
  telefono: string | null;
  celular: string | null;
  telefono_residencia: string | null;
  email: string | null;
  direccion: string | null;
  direccion_actual: string | null;
  sector_actual: string | null;
  redes_sociales: RedesSociales;
  sector_id: string | null;
  comite_id: string | null;
  nivel_intermedio_id: string | null;
  coordinador_id: string | null;
  recinto_id: string | null;
  foto_url: string | null;
  vinculado: boolean;
  colegio: string | null;
  colegio_ubicacion: string | null;
  movimiento_id: string | null;
  tipo_movimiento: string | null;
  votacion: boolean;
  estado: boolean;
  tenant_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- List Item (table display) ----------

/**
 * Abbreviated member record for table views.
 * Includes resolved geographic names from joined tables.
 */
export interface MemberListItem {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  apodo: string | null;
  tipo_miembro: MemberType;
  estado: boolean;
  foto_url: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  sector_id: string | null;
  coordinador_id: string | null;
  /** Resolved names from PostgREST joins or RPC */
  coordinador_nombre: string | null;
  sector_nombre: string | null;
  circunscripcion_nombre: string | null;
  municipio_nombre: string | null;
  provincia_nombre: string | null;
  created_at: string;
}

// ---------- Form Data Shapes ----------

/** Data shape for creating a new member. */
export interface CreateMemberData {
  cedula: string;
  nombre: string;
  apellido: string;
  tipo_miembro: MemberType;
  apodo?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  ocupacion?: string | null;
  trabajo?: string | null;
  telefono?: string | null;
  celular?: string | null;
  telefono_residencia?: string | null;
  email?: string | null;
  direccion?: string | null;
  direccion_actual?: string | null;
  sector_actual?: string | null;
  redes_sociales?: RedesSociales;
  sector_id?: string | null;
  comite_id?: string | null;
  nivel_intermedio_id?: string | null;
  coordinador_id?: string | null;
  recinto_id?: string | null;
  foto_url?: string | null;
  vinculado?: boolean;
  colegio?: string | null;
  colegio_ubicacion?: string | null;
  movimiento_id?: string | null;
  tipo_movimiento?: string | null;
  votacion?: boolean;
  crear_acceso?: boolean;
  acceso_email?: string | null;
  acceso_temp_password?: string | null;
}

/** Data shape for updating an existing member. */
export interface UpdateMemberData extends Partial<CreateMemberData> {
  estado?: boolean;
}

// ---------- Filters ----------

/** Search and filter state for the member list. */
export interface MemberFilters {
  search: string;
  tipo_miembro: MemberType | '';
  provincia_id: string;
  municipio_id: string;
  circunscripcion_id: string;
  sector_id: string;
  estado: 'all' | 'active' | 'inactive';
  page: number;
}

export const DEFAULT_MEMBER_FILTERS: MemberFilters = {
  search: '',
  tipo_miembro: '',
  provincia_id: '',
  municipio_id: '',
  circunscripcion_id: '',
  sector_id: '',
  estado: 'all',
  page: 1,
};

export const PAGE_SIZE = 25;

// ---------- Member Detail (with full joins) ----------

/** Member detail with all geographic and coordinator info resolved. */
export interface MemberDetail extends Member {
  sector_nombre: string | null;
  circunscripcion_nombre: string | null;
  municipio_nombre: string | null;
  provincia_nombre: string | null;
  coordinador_nombre: string | null;
  coordinador_apellido: string | null;
  coordinador_cedula: string | null;
}

// ---------- Coordinator Option (for select) ----------

export interface CoordinatorOption {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
}

// ---------- Stats ----------

export interface MemberStats {
  total: number;
  coordinadores: number;
  multiplicadores: number;
  relacionados: number;
}

// ---------- Utility: Cedula formatting ----------

/** Format an 11-digit cedula as XXX-XXXXXXX-X for display. */
export function formatCedula(cedula: string): string {
  const digits = cedula.replace(/\D/g, '');
  if (digits.length !== 11) return cedula;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
}

/** Strip a formatted cedula back to 11 digits. */
export function stripCedula(cedula: string): string {
  return cedula.replace(/\D/g, '');
}

/** Format a phone number for display (XXX-XXX-XXXX). */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// ---------- Badge config ----------

export const TIPO_MIEMBRO_LABELS: Record<MemberType, string> = {
  coordinador: 'Coordinador',
  multiplicador: 'Multiplicador',
  relacionado: 'Relacionado',
};

export const TIPO_MIEMBRO_BADGE_STYLES: Record<MemberType, string> = {
  coordinador: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  multiplicador: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  relacionado: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-100',
};

// ---------- Seguimiento (Follow-up Tracking) ----------

export type SeguimientoTipo = 'llamada' | 'visita' | 'mensaje' | 'reunion' | 'otro';

/** A follow-up entry for a member. */
export interface SeguimientoEntry {
  id: string;
  miembro_id: string;
  usuario_id: string;
  tipo: SeguimientoTipo;
  notas: string;
  resultado: string | null;
  fecha: string;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
  /** Resolved from usuarios join */
  usuario_nombre?: string;
}

/** Payload for creating a new follow-up entry. */
export interface CreateSeguimientoPayload {
  tipo: SeguimientoTipo;
  notas: string;
  resultado?: string;
  fecha?: string;
}

// ---------- Pagination ----------

/** Pagination metadata included in list responses. */
export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ---------- Bulk Operations ----------

export type BulkAction = 'assign_coordinator' | 'change_status' | 'assign_geographic';

/** Payload for bulk member operations. */
export interface BulkOperationPayload {
  member_ids: string[];
  action: BulkAction;
  /**
   * Value depends on action:
   * - assign_coordinator: UUID string of the new coordinador
   * - change_status: boolean (true = active, false = inactive)
   * - assign_geographic: { sector_id?: string, comite_id?: string, nivel_intermedio_id?: string }
   */
  value: string | boolean | Record<string, string>;
}

/** Response from a bulk operation. */
export interface BulkOperationResponse {
  updated: number;
  action: BulkAction;
}

// ---------- API Response Wrappers ----------

export interface MemberListResponse {
  data: MemberListItem[];
  meta: PaginationMeta;
}

export interface MemberDetailResponse {
  data: MemberDetail;
}
