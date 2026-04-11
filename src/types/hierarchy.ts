/**
 * Types for the Organizational Hierarchy feature (ftr-004).
 *
 * Represents the 6-level Dominican political geographic hierarchy:
 * Provincia > Municipio > Circunscripcion > Sector > Comite > Nivel Intermedio
 */

import type { Database } from '../../types/supabase';

// ---------- Level Definition ----------

export type HierarchyLevel =
  | 'provincia'
  | 'municipio'
  | 'circunscripcion'
  | 'sector'
  | 'comite'
  | 'nivel_intermedio';

/** Ordered from top to bottom of the hierarchy. */
export const HIERARCHY_ORDER: HierarchyLevel[] = [
  'provincia',
  'municipio',
  'circunscripcion',
  'sector',
  'comite',
  'nivel_intermedio',
];

/** Spanish labels for each level (singular and plural). */
export const LEVEL_LABELS: Record<
  HierarchyLevel,
  { singular: string; plural: string }
> = {
  provincia: { singular: 'Provincia', plural: 'Provincias' },
  municipio: { singular: 'Municipio', plural: 'Municipios' },
  circunscripcion: {
    singular: 'Circunscripcion',
    plural: 'Circunscripciones',
  },
  sector: { singular: 'Sector', plural: 'Sectores' },
  comite: { singular: 'Comite', plural: 'Comites' },
  nivel_intermedio: {
    singular: 'Nivel Intermedio',
    plural: 'Niveles Intermedios',
  },
};

/** Map from each level to its Supabase table name. */
export const LEVEL_TABLE: Record<HierarchyLevel, string> = {
  provincia: 'provincias',
  municipio: 'municipios',
  circunscripcion: 'circunscripciones',
  sector: 'sectores',
  comite: 'comites',
  nivel_intermedio: 'niveles_intermedios',
};

/**
 * Map each level to the foreign key column that points to its parent.
 * Provincia has no parent so it is null.
 */
export const LEVEL_PARENT_FK: Record<HierarchyLevel, string | null> = {
  provincia: null,
  municipio: 'provincia_id',
  circunscripcion: 'municipio_id',
  sector: 'circunscripcion_id',
  comite: 'sector_id',
  nivel_intermedio: 'comite_id',
};

/** The child level for each level, or null if leaf. */
export function getChildLevel(
  level: HierarchyLevel
): HierarchyLevel | null {
  const idx = HIERARCHY_ORDER.indexOf(level);
  if (idx === -1 || idx === HIERARCHY_ORDER.length - 1) return null;
  return HIERARCHY_ORDER[idx + 1];
}

/** The parent level for each level, or null if root. */
export function getParentLevel(
  level: HierarchyLevel
): HierarchyLevel | null {
  const idx = HIERARCHY_ORDER.indexOf(level);
  if (idx <= 0) return null;
  return HIERARCHY_ORDER[idx - 1];
}

// ---------- Entity Types ----------

/**
 * A unified entity representation used across all hierarchy levels.
 * The actual columns vary by table but we normalize into this shape.
 */
export interface HierarchyEntity {
  id: string;
  nombre: string;
  /** `codigo` for most levels, `numero` for circunscripciones. */
  codigo: string;
  estado: boolean;
  level: HierarchyLevel;
  /** Aggregated member count from materialized views (nullable). */
  member_count?: number | null;
  created_at: string;
}

/**
 * Breadcrumb segment for hierarchy navigation.
 */
export interface HierarchyBreadcrumbItem {
  label: string;
  level: HierarchyLevel;
  id: string;
}

// ---------- DB Row types (shorthand) ----------

export type ProvinciaRow =
  Database['public']['Tables']['provincias']['Row'];
export type MunicipioRow =
  Database['public']['Tables']['municipios']['Row'];
export type CircunscripcionRow =
  Database['public']['Tables']['circunscripciones']['Row'];
export type SectorRow =
  Database['public']['Tables']['sectores']['Row'];
export type ComiteRow =
  Database['public']['Tables']['comites']['Row'];
export type NivelIntermedioRow =
  Database['public']['Tables']['niveles_intermedios']['Row'];
