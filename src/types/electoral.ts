/**
 * Types for the Electoral Process Monitoring feature (ftr-006).
 *
 * Covers: periodos electorales, candidatos, recintos, colegios,
 * observer assignments, vote recording, actas, and voter turnout.
 */

// ---------- Constants ----------

export const PAGE_SIZE_ELECTORAL = 25;

export const PERIODO_TIPO_LABELS: Record<string, string> = {
  primaria: 'Primaria',
  general: 'General',
  municipal: 'Municipal',
};

// ---------- Periodo Electoral ----------

export interface PeriodoElectoral {
  id: string;
  nombre: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  partido_id: string;
  estado: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeriodoElectoralListItem extends PeriodoElectoral {
  partido_nombre?: string | null;
  partido_siglas?: string | null;
}

export interface CreatePeriodoData {
  nombre: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  partido_id: string;
  activo?: boolean;
}

export interface UpdatePeriodoData extends Partial<CreatePeriodoData> {
  estado?: boolean;
}

// ---------- Candidato ----------

export interface Candidato {
  id: string;
  nombre: string | null;
  partido_id: string;
  cargo_id: string | null;
  miembro_id: string | null;
  orden: number | null;
  periodo_id: string | null;
  estado: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidatoListItem extends Candidato {
  partido_nombre?: string | null;
  partido_siglas?: string | null;
  partido_color?: string | null;
}

export interface CreateCandidatoData {
  nombre: string;
  partido_id: string;
  cargo_id?: string | null;
  orden: number;
  periodo_id: string;
}

export interface UpdateCandidatoData extends Partial<CreateCandidatoData> {
  estado?: boolean;
}

// ---------- Recinto ----------

export interface Recinto {
  id: string;
  cod_recinto: string;
  nombre: string;
  direccion: string | null;
  municipio_id: string;
  circunscripcion_id: string | null;
  partido_id: string | null;
  estado: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecintoListItem extends Recinto {
  municipio_nombre?: string | null;
  circunscripcion_nombre?: string | null;
  colegios_count?: number;
  observadores_count?: number;
}

export interface CreateRecintoData {
  cod_recinto: string;
  nombre: string;
  direccion?: string | null;
  municipio_id: string;
  circunscripcion_id?: string | null;
}

export interface UpdateRecintoData extends Partial<CreateRecintoData> {
  estado?: boolean;
}

// ---------- Colegio ----------

export interface Colegio {
  id: string;
  cod_colegio: string;
  nombre: string | null;
  recinto_id: string;
  partido_id: string;
  estado: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateColegioData {
  cod_colegio: string;
  nombre?: string | null;
  recinto_id: string;
}

export interface UpdateColegioData {
  cod_colegio?: string;
  nombre?: string | null;
  estado?: boolean;
}

// ---------- Asignacion Recintos ----------

export interface AsignacionRecinto {
  id: string;
  recinto_id: string;
  colegio_id: string | null;
  usuario_id: string;
  periodo_id: string;
  partido_id: string;
  estado: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AsignacionListItem extends AsignacionRecinto {
  usuario_nombre?: string | null;
  usuario_apellido?: string | null;
  usuario_email?: string | null;
  recinto_nombre?: string | null;
  recinto_cod?: string | null;
  colegio_nombre?: string | null;
  colegio_cod?: string | null;
}

export interface CreateAsignacionData {
  recinto_id: string;
  colegio_id?: string | null;
  usuario_id: string;
  periodo_id: string;
}

// ---------- Candidato Votos ----------

export interface CandidatoVoto {
  id: string;
  candidato_id: string;
  colegio_id: string;
  recinto_id: string;
  votos: number;
  periodo_id: string;
  partido_id: string;
  updated_by: string | null;
  estado: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoteRecordItem extends CandidatoVoto {
  candidato_nombre?: string | null;
  candidato_orden?: number | null;
  partido_nombre?: string | null;
  partido_siglas?: string | null;
  partido_color?: string | null;
}

export interface UpdateVoteData {
  id: string;
  votos: number;
}

// ---------- Acta ----------

export interface Acta {
  id: string;
  numero_acta: string | null;
  recinto_id: string;
  colegio_id: string;
  votos_data: Record<string, number>;
  observaciones: string | null;
  registrado_por: string;
  periodo_id: string;
  partido_id: string;
  estado: boolean;
  tenant_id: string | null;
  created_at: string;
}

export interface ActaListItem extends Acta {
  recinto_nombre?: string | null;
  recinto_cod?: string | null;
  colegio_nombre?: string | null;
  colegio_cod?: string | null;
  registrado_por_nombre?: string | null;
}

export interface CreateActaData {
  numero_acta?: string | null;
  recinto_id: string;
  colegio_id: string;
  votos_data: Record<string, number>;
  observaciones?: string | null;
  periodo_id: string;
}

// ---------- Turnout ----------

export interface TurnoutMember {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  votacion: boolean;
  celular: string | null;
  telefono: string | null;
}

export interface TurnoutStats {
  total: number;
  votaron: number;
  no_votaron: number;
  porcentaje: number;
}

// ---------- Filters ----------

export interface CandidatoFilters {
  search: string;
  partido_id: string;
  periodo_id: string;
  page: number;
}

export const DEFAULT_CANDIDATO_FILTERS: CandidatoFilters = {
  search: '',
  partido_id: '',
  periodo_id: '',
  page: 1,
};

export interface RecintoFilters {
  search: string;
  municipio_id: string;
  circunscripcion_id: string;
  page: number;
}

export const DEFAULT_RECINTO_FILTERS: RecintoFilters = {
  search: '',
  municipio_id: '',
  circunscripcion_id: '',
  page: 1,
};

// ---------- Partido (reference) ----------

export interface PartidoOption {
  id: string;
  nombre: string;
  siglas: string | null;
  color: string | null;
}

// ---------- Usuario Option (for assignments) ----------

export interface UsuarioOption {
  id: string;
  auth_user_id: string | null;
  nombre: string;
  apellido: string;
  email: string | null;
  role: string;
}
