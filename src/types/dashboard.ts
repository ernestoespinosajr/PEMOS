/**
 * Types for the Election-Night Dashboard (ftr-006 Phase 3).
 *
 * Covers: connection status, summary cards, party vote charts,
 * results timeline, turnout by recinto, and dashboard filters.
 */

// ---------- Connection Status ----------

export type ConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'polling'
  | 'disconnected';

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Conectado',
  reconnecting: 'Reconectando',
  polling: 'Modo Polling',
  disconnected: 'Desconectado',
};

// ---------- Dashboard Summary ----------

export interface DashboardSummary {
  total_votos: number;
  total_recintos: number;
  recintos_reportados: number;
  total_actas: number;
}

// ---------- Party Vote Data (Bar Chart) ----------

export interface PartyVoteData {
  partido_id: string;
  partido_nombre: string;
  partido_siglas: string | null;
  partido_color: string | null;
  total_votos: number;
  recintos_reportados: number;
}

// ---------- Timeline Data Point (Line Chart) ----------

export interface TimelineDataPoint {
  timestamp: string;
  total_votos: number;
  actas_count: number;
}

// ---------- Turnout by Recinto ----------

export interface RecintoTurnout {
  recinto_id: string;
  recinto_nombre: string;
  total_miembros: number;
  votaron: number;
  no_votaron: number;
  porcentaje: number;
}

// ---------- Dashboard Filters ----------

export interface DashboardFilters {
  circunscripcion_id: string;
  municipio_id: string;
  recinto_id: string;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  circunscripcion_id: '',
  municipio_id: '',
  recinto_id: '',
};

// ---------- Candidate Vote Data (Comparison Chart) ----------

export interface CandidateVoteData {
  candidato_id: string;
  candidato_nombre: string;
  partido_id: string;
  partido_nombre: string;
  partido_siglas: string | null;
  partido_color: string | null;
  total_votos: number;
  porcentaje: number;
}

// ---------- Precinct Progress (Acta Reporting) ----------

export interface PrecinctProgress {
  recinto_id: string;
  recinto_nombre: string;
  total_colegios: number;
  colegios_reportados: number;
  porcentaje: number;
  last_update: string | null;
}

// ---------- Filter Options ----------

export interface FilterOption {
  id: string;
  nombre: string;
}
