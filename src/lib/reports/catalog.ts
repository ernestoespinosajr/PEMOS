// =============================================================================
// Report Catalog (ftr-008)
// =============================================================================
// Central manifest of all available reports. Defines the mapping between
// report types, their database RPC functions, required filters, and metadata.
//
// This is the single source of truth for:
//   - The report builder UI (ReportTypeSelector)
//   - The API route validation (POST /api/reports/generate)
//   - The legacy RDLC deduplication mapping
//
// Adding a new report type:
//   1. Add the RPC function in a new migration
//   2. Add the type to ReportType in src/types/reports.ts
//   3. Add the definition to REPORT_CATALOG below
//   4. The API and UI will automatically pick it up
// =============================================================================

import type {
  ReportDefinition,
  ReportCategory,
  ReportType,
} from '@/types/reports';

/**
 * Complete catalog of all available reports.
 */
export const REPORT_CATALOG: readonly ReportDefinition[] = [
  // =========================================================================
  // MEMBER REPORTS (Reportes de Miembros)
  // =========================================================================
  {
    type: 'members_by_coordinator',
    category: 'miembros',
    name: 'Miembros por Coordinador',
    description: 'Listado de miembros agrupados por su coordinador asignado',
    filters: ['provincia_id', 'municipio_id', 'circunscripcion_id', 'sector_id'],
    rpcFunction: 'rpt_members_by_coordinator',
    legacyFiles: [
      'rdl_coordinador.rdl',
      'rdl_coordinador_viejo.rdl',
      'rdl_miembros_coordinador.rdl',
    ],
    supportsServerSide: true,
  },
  {
    type: 'members_by_recinto',
    category: 'miembros',
    name: 'Miembros por Recinto',
    description: 'Listado de miembros organizados por recinto electoral',
    filters: ['provincia_id', 'municipio_id', 'circunscripcion_id'],
    rpcFunction: 'rpt_members_by_recinto',
    legacyFiles: ['rdl_miembros_por_recinto.rdl'],
    supportsServerSide: true,
  },
  {
    type: 'members_not_in_padron',
    category: 'miembros',
    name: 'Miembros No Inscritos en Padron',
    description: 'Miembros cuya cedula no aparece en el padron electoral externo',
    filters: ['provincia_id', 'municipio_id', 'circunscripcion_id'],
    rpcFunction: 'rpt_members_not_in_padron',
    legacyFiles: ['rdl_miembros_no_padron.rdl'],
    supportsServerSide: true,
  },
  {
    type: 'members_by_sector',
    category: 'miembros',
    name: 'Miembros por Sector',
    description: 'Resumen de miembros agrupados por sector con totales por tipo',
    filters: ['provincia_id', 'municipio_id', 'circunscripcion_id', 'sector_id'],
    rpcFunction: 'rpt_members_by_sector',
    legacyFiles: ['rdl_reporte_por_sector.rdl', 'rdl_total_sector.rdl'],
    supportsServerSide: true,
  },
  {
    type: 'members_by_liaison',
    category: 'miembros',
    name: 'Miembros por Enlace / Nivel Intermedio',
    description:
      'Miembros agrupados por nivel intermedio (enlace) con conteo por nivel',
    filters: ['sector_id', 'comite_id'],
    rpcFunction: 'rpt_members_by_liaison',
    legacyFiles: [
      'rdl_miembrosPorEnlace.rdl',
      'rdl_resumen_por_intermedio.rdl',
      'rdl_total_intermedio.rdl',
      'rdl_total_intermedio_cargo.rdl',
    ],
    supportsServerSide: true,
  },
  {
    type: 'member_detail',
    category: 'miembros',
    name: 'Detalle de Miembro',
    description: 'Informacion completa de un miembro individual',
    filters: ['miembro_id'],
    rpcFunction: 'rpt_member_detail',
    legacyFiles: [
      'rdl_miembro_detalle.rdl',
      'rdl_miembros_detalle.rdl',
      'rdl_miembro_detalle_colegio.rdl',
    ],
    supportsServerSide: false,
  },
  {
    type: 'member_listing',
    category: 'miembros',
    name: 'Listado General de Miembros',
    description: 'Listado general de miembros con filtros geograficos y por tipo',
    filters: ['provincia_id', 'municipio_id', 'circunscripcion_id', 'sector_id'],
    rpcFunction: 'search_members',
    legacyFiles: [
      'rdl_miembros.rdl',
      'rdl_miembros_old.rdl',
      'rdl_miembros-viejo.rdl',
    ],
    supportsServerSide: true,
  },

  // =========================================================================
  // ELECTORAL REPORTS (Reportes Electorales)
  // =========================================================================
  {
    type: 'vote_summary_by_party',
    category: 'electoral',
    name: 'Resumen de Votos por Partido',
    description: 'Totales de votos por partido para un periodo electoral',
    filters: ['periodo_id'],
    rpcFunction: 'rpt_vote_summary_by_party',
    legacyFiles: ['rdl_resumenPartido.rdl', 'rdl_resumenPartidoT.rdl'],
    supportsServerSide: false,
  },
  {
    type: 'vote_summary_by_recinto',
    category: 'electoral',
    name: 'Resumen de Votos por Recinto',
    description: 'Totales de votos por recinto para un periodo electoral',
    filters: ['periodo_id', 'provincia_id', 'municipio_id'],
    rpcFunction: 'rpt_vote_summary_by_recinto',
    legacyFiles: ['rdl_resumen_por_recinto.rdl'],
    supportsServerSide: true,
  },
  {
    type: 'vote_summary_by_alliance',
    category: 'electoral',
    name: 'Resumen de Votos por Alianza',
    description:
      'Votos agrupados por alianza/coalicion de partidos (PLD, PRM, etc.)',
    filters: ['periodo_id', 'alliance_prefix'],
    rpcFunction: 'rpt_vote_summary_by_alliance',
    legacyFiles: [
      'rdl_resumenPartido_porAlianzaPLD.rdl',
      'rdl_resumenPartido_porAlianzaPRM.rdl',
      'rdl_resumenPartido_colegio.rdl',
    ],
    supportsServerSide: false,
  },
  {
    type: 'actas_status',
    category: 'electoral',
    name: 'Estado de Actas Electorales',
    description:
      'Estado de actas por recinto: registradas, faltantes, completitud',
    filters: ['periodo_id', 'provincia_id', 'municipio_id'],
    rpcFunction: 'rpt_actas_status',
    legacyFiles: ['rdl_acta_computada.rdl', 'rdl_acta_faltante.rdl'],
    supportsServerSide: true,
  },
  {
    type: 'turnout_by_recinto',
    category: 'electoral',
    name: 'Participacion por Recinto',
    description:
      'Resumen de participacion electoral (turnout) por recinto: votaron vs no votaron',
    filters: ['periodo_id', 'provincia_id', 'municipio_id'],
    rpcFunction: 'rpt_turnout_by_recinto',
    legacyFiles: [],
    supportsServerSide: true,
  },

  // =========================================================================
  // GEOGRAPHIC / ORGANIZATIONAL REPORTS (Reportes Geograficos)
  // =========================================================================
  {
    type: 'summary_by_geographic_level',
    category: 'geografico',
    name: 'Resumen por Nivel Geografico',
    description:
      'Totales de miembros en un nivel geografico (provincia, municipio, circunscripcion, sector)',
    filters: ['nivel', 'parent_id'],
    rpcFunction: 'rpt_summary_by_geographic_level',
    legacyFiles: [
      'rdl_resumen_por_bloque.rdl',
      'rdl_resumen_por_intermedio.rdl',
    ],
    supportsServerSide: false,
  },
  {
    type: 'coordinator_summary',
    category: 'geografico',
    name: 'Resumen por Coordinador',
    description:
      'Rendimiento de coordinadores con conteo de multiplicadores y relacionados',
    filters: ['provincia_id', 'municipio_id'],
    rpcFunction: 'rpt_coordinator_summary',
    legacyFiles: ['rdl_resumen_porCoordinador.rdl'],
    supportsServerSide: true,
  },

  // =========================================================================
  // REGISTRATION REPORTS (Reportes de Registro)
  // =========================================================================
  {
    type: 'daily_registration',
    category: 'registro',
    name: 'Registro Diario de Miembros',
    description:
      'Conteo diario de registros de miembros con acumulado y desglose por tipo',
    filters: ['date_from', 'date_to'],
    rpcFunction: 'rpt_daily_registration',
    legacyFiles: ['rdl_registro_por_dia.rdl', 'rdl_miembro_graficos.rdl'],
    supportsServerSide: false,
  },

  // =========================================================================
  // ACTIVITY REPORTS (Reportes de Actividad)
  // =========================================================================
  {
    type: 'seguimiento_activity',
    category: 'actividad',
    name: 'Actividad de Seguimiento',
    description:
      'Resumen de actividad de seguimiento por usuario: contactos, registros, rechazos',
    filters: ['date_from', 'date_to', 'usuario_id'],
    rpcFunction: 'rpt_seguimiento_activity',
    legacyFiles: [
      'rdl_avance_llamada_usuario.rdl',
      'rdl_avance_llamada_externa_usuario.rdl',
      'rdl_avance_llamada_externas_usuario.rdl',
      'rdl_llamadas_por_coordinador.rdl',
      'rdl_llamadas_por_usuario_dia.rdl',
      'rdl_llamadas_por_usuario_dia(viejo).rdl',
      'rdl_llamadas_externa_por_usuario_dia.rdl',
      'rdl_convencido_contactado.rdl',
      'rdl_intermedio_recinto_c1.rdl',
      'rdl_intermedio_recinto_c1_detalle.rdl',
    ],
    supportsServerSide: true,
  },
] as const;

// ---------------------------------------------------------------------------
// Category metadata for the report builder sidebar
// ---------------------------------------------------------------------------

export interface CategoryInfo {
  key: ReportCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
}

export const REPORT_CATEGORIES: readonly CategoryInfo[] = [
  {
    key: 'miembros',
    label: 'Reportes de Miembros',
    description: 'Listados, detalles y agrupaciones de miembros',
    icon: 'Users',
  },
  {
    key: 'electoral',
    label: 'Reportes Electorales',
    description: 'Votos, actas, participacion y resultados',
    icon: 'Vote',
  },
  {
    key: 'geografico',
    label: 'Reportes Geograficos',
    description: 'Resumenes por nivel geografico y coordinador',
    icon: 'MapPin',
  },
  {
    key: 'registro',
    label: 'Reportes de Registro',
    description: 'Tendencias y conteos de registro de miembros',
    icon: 'CalendarDays',
  },
  {
    key: 'actividad',
    label: 'Reportes de Actividad',
    description: 'Seguimiento, llamadas y contactos por usuario',
    icon: 'Activity',
  },
] as const;

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Get report definition by type. Returns undefined if not found.
 */
export function getReportDefinition(
  reportType: ReportType
): ReportDefinition | undefined {
  return REPORT_CATALOG.find((r) => r.type === reportType);
}

/**
 * Get all reports in a specific category.
 */
export function getReportsByCategory(
  category: ReportCategory
): ReportDefinition[] {
  return REPORT_CATALOG.filter((r) => r.category === category);
}

/**
 * Validate that a report type string is a valid ReportType.
 */
export function isValidReportType(type: string): type is ReportType {
  return REPORT_CATALOG.some((r) => r.type === type);
}

/**
 * All valid report type strings for validation.
 */
export const VALID_REPORT_TYPES: readonly string[] = REPORT_CATALOG.map(
  (r) => r.type
);
