// =============================================================================
// Types: Reporting System (ftr-008)
// =============================================================================
// Type definitions for the PEMOS reporting API. These map to the PostgreSQL
// RPC functions created in migration 20260410000004_reporting_system_rpc.sql
// and the API routes at /api/reports/*.
// =============================================================================

// ---------------------------------------------------------------------------
// Report Catalog -- Maps report types to their RPC function names and filters
// ---------------------------------------------------------------------------

/**
 * All available report type identifiers.
 * Each maps to a specific PostgreSQL RPC function.
 */
export type ReportType =
  // Member reports
  | 'members_by_coordinator'
  | 'members_by_recinto'
  | 'members_not_in_padron'
  | 'members_by_sector'
  | 'members_by_liaison'
  | 'member_detail'
  | 'member_listing'
  // Electoral reports
  | 'vote_summary_by_party'
  | 'vote_summary_by_recinto'
  | 'vote_summary_by_alliance'
  | 'actas_status'
  | 'turnout_by_recinto'
  // Geographic/Organizational reports
  | 'summary_by_geographic_level'
  | 'coordinator_summary'
  // Registration reports
  | 'daily_registration'
  // Activity reports
  | 'seguimiento_activity';

/**
 * Report categories for the report builder sidebar.
 */
export type ReportCategory =
  | 'miembros'
  | 'electoral'
  | 'geografico'
  | 'registro'
  | 'actividad';

/**
 * Metadata for a single report type used by the report builder.
 */
export interface ReportDefinition {
  type: ReportType;
  category: ReportCategory;
  name: string;
  description: string;
  /** Which filter controls to show in the report builder */
  filters: ReportFilterField[];
  /** The PostgreSQL RPC function name */
  rpcFunction: string;
  /** Legacy RDLC file(s) this report replaces */
  legacyFiles: string[];
  /** Whether this report can be large enough to warrant server-side generation */
  supportsServerSide: boolean;
}

/**
 * Available filter field types for the report builder.
 */
export type ReportFilterField =
  | 'provincia_id'
  | 'municipio_id'
  | 'circunscripcion_id'
  | 'sector_id'
  | 'comite_id'
  | 'periodo_id'
  | 'date_from'
  | 'date_to'
  | 'miembro_id'
  | 'usuario_id'
  | 'alliance_prefix'
  | 'nivel'
  | 'parent_id';

// ---------------------------------------------------------------------------
// Report Filter Parameters -- Sent by the frontend to the API
// ---------------------------------------------------------------------------

/**
 * Superset of all possible report filter values.
 * Each report type uses a subset of these fields.
 */
export interface ReportFilters {
  provincia_id?: string | null;
  municipio_id?: string | null;
  circunscripcion_id?: string | null;
  sector_id?: string | null;
  comite_id?: string | null;
  periodo_id?: string | null;
  date_from?: string | null; // ISO date string YYYY-MM-DD
  date_to?: string | null;   // ISO date string YYYY-MM-DD
  miembro_id?: string | null;
  usuario_id?: string | null;
  alliance_prefix?: string | null;
  nivel?: string | null;
  parent_id?: string | null;
}

/**
 * Request body for POST /api/reports/generate
 */
export interface GenerateReportRequest {
  report_type: ReportType;
  filters: ReportFilters;
}

/**
 * Response from POST /api/reports/generate
 */
export interface GenerateReportResponse {
  data: Record<string, unknown>[];
  meta: {
    report_type: ReportType;
    row_count: number;
    generated_at: string;
    filters_applied: ReportFilters;
  };
}

// ---------------------------------------------------------------------------
// Report Archive Types
// ---------------------------------------------------------------------------

/**
 * A report archive entry stored in the report_archives table.
 */
export interface ReportArchive {
  id: string;
  tenant_id: string;
  report_type: string;
  report_name: string;
  filters_applied: ReportFilters;
  generated_at: string;
  generated_by: string;
  file_path: string;
  file_size_bytes: number;
  estado: boolean;
  created_at: string;
}

/**
 * Request body for POST /api/reports/archives
 */
export interface CreateArchiveRequest {
  report_type: ReportType;
  report_name: string;
  filters_applied: ReportFilters;
  file_path: string;
  file_size_bytes: number;
}

// ---------------------------------------------------------------------------
// Row types for each report (matching RPC return shapes)
// ---------------------------------------------------------------------------

export interface MembersByCoordinatorRow {
  coordinador_id: string;
  coordinador_cedula: string;
  coordinador_nombre: string;
  coordinador_apellido: string;
  coordinador_telefono: string | null;
  coordinador_sector: string | null;
  miembro_id: string;
  miembro_cedula: string;
  miembro_nombre: string;
  miembro_apellido: string;
  miembro_telefono: string | null;
  miembro_celular: string | null;
  miembro_tipo: string;
  miembro_sector: string | null;
  miembro_estado: boolean;
}

export interface MembersByRecintoRow {
  recinto_id: string;
  recinto_nombre: string;
  recinto_codigo: string;
  recinto_municipio: string;
  miembro_id: string;
  miembro_cedula: string;
  miembro_nombre: string;
  miembro_apellido: string;
  miembro_telefono: string | null;
  miembro_celular: string | null;
  miembro_tipo: string;
  miembro_colegio: string | null;
  miembro_sector: string | null;
}

export interface MembersNotInPadronRow {
  miembro_id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  celular: string | null;
  tipo_miembro: string;
  sector_nombre: string | null;
  circunscripcion_nombre: string | null;
  municipio_nombre: string | null;
}

export interface MembersBySectorRow {
  sector_id: string;
  sector_nombre: string;
  sector_codigo: string | null;
  circunscripcion_nombre: string;
  municipio_nombre: string;
  total_miembros: number;
  coordinadores: number;
  multiplicadores: number;
  relacionados: number;
}

export interface MembersByLiaisonRow {
  nivel_intermedio_id: string;
  nivel_intermedio_nombre: string;
  nivel_intermedio_codigo: string | null;
  comite_nombre: string;
  sector_nombre: string;
  miembro_id: string | null;
  miembro_cedula: string | null;
  miembro_nombre: string | null;
  miembro_apellido: string | null;
  miembro_telefono: string | null;
  miembro_tipo: string | null;
  total_in_nivel: number;
}

export interface MemberDetailRow {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  apodo: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  telefono: string | null;
  celular: string | null;
  telefono_residencia: string | null;
  email: string | null;
  direccion: string | null;
  direccion_actual: string | null;
  ocupacion: string | null;
  trabajo: string | null;
  tipo_miembro: string;
  vinculado: boolean;
  votacion: boolean;
  colegio: string | null;
  colegio_ubicacion: string | null;
  sector_nombre: string | null;
  circunscripcion_nombre: string | null;
  municipio_nombre: string | null;
  provincia_nombre: string | null;
  comite_nombre: string | null;
  nivel_intermedio_nombre: string | null;
  coordinador_nombre: string | null;
  coordinador_cedula: string | null;
  coordinador_telefono: string | null;
  recinto_nombre: string | null;
  foto_url: string | null;
  created_at: string;
}

export interface VoteSummaryByPartyRow {
  partido_id: string;
  partido_nombre: string;
  partido_siglas: string;
  partido_color: string | null;
  total_votos: number;
  recintos_reportados: number;
  porcentaje: number;
}

export interface VoteSummaryByRecintoRow {
  recinto_id: string;
  recinto_nombre: string;
  recinto_codigo: string;
  municipio_nombre: string;
  total_votos: number;
  candidatos_reportados: number;
  colegios_reportados: number;
}

export interface VoteSummaryByAllianceRow {
  partido_id: string;
  partido_nombre: string;
  partido_siglas: string;
  partido_color: string | null;
  total_votos: number;
  recintos_reportados: number;
  porcentaje_of_alliance: number;
}

export interface ActasStatusRow {
  recinto_id: string;
  recinto_nombre: string;
  recinto_codigo: string;
  municipio_nombre: string;
  total_colegios: number;
  actas_registradas: number;
  actas_faltantes: number;
  estado_completitud: string;
  ultima_acta_at: string | null;
}

export interface TurnoutByRecintoRow {
  recinto_id: string;
  recinto_nombre: string;
  municipio_nombre: string;
  total_miembros: number;
  votaron: number;
  no_votaron: number;
  tasa_participacion: number;
}

export interface SummaryByGeographicLevelRow {
  geo_id: string;
  geo_nombre: string;
  total_miembros: number;
  coordinadores: number;
  multiplicadores: number;
  relacionados: number;
}

export interface CoordinatorSummaryRow {
  coordinador_id: string;
  coordinador_cedula: string;
  coordinador_nombre: string;
  coordinador_apellido: string;
  coordinador_telefono: string | null;
  sector_nombre: string | null;
  municipio_nombre: string | null;
  total_multiplicadores: number;
  total_relacionados: number;
  total_subordinados: number;
}

export interface DailyRegistrationRow {
  registration_date: string;
  total_registrations: number;
  coordinadores: number;
  multiplicadores: number;
  relacionados: number;
  cumulative_total: number;
}

export interface SeguimientoActivityRow {
  usuario_id: string;
  usuario_nombre: string;
  fecha: string;
  total_contactos: number;
  contactados_si: number;
  contactados_no: number;
  registrados: number;
  rechazados: number;
  pendientes: number;
}
