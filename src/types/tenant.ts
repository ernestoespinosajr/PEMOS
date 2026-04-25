/**
 * PEMOS Multi-Tenant Type Definitions
 *
 * Types for tenant management, branding, and provisioning.
 * Aligned with the actual database schema from:
 *   supabase/migrations/20260410000008_create_tenants_table.sql
 *   supabase/migrations/20260410000010_tenant_provisioning_and_validation.sql
 */

/**
 * Subscription plan tiers.
 * Maps to DB CHECK constraint: ('basico', 'profesional', 'empresarial')
 */
export type TenantPlan = 'basico' | 'profesional' | 'empresarial';

/**
 * Tenant branding configuration applied via CSS custom properties.
 * Derived from the tenants table columns used for UI display.
 */
export interface TenantBranding {
  /** Party name displayed in sidebar and page titles */
  nombre: string;
  /** URL to the tenant's logo in Supabase Storage */
  logo_url: string | null;
  /** Primary accent color hex (overrides default #2D6A4F) */
  color_primario: string;
  /** Secondary color hex (optional) */
  color_secundario: string | null;
}

/**
 * Full tenant record from the tenants table.
 * Matches the DB schema exactly.
 */
export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string | null;
  plan: TenantPlan;
  activo: boolean;
  max_usuarios: number;
  max_miembros: number;
  configuracion: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Tenant with computed usage metrics (for platform admin views).
 * Matches the mv_tenant_usage_stats materialized view.
 */
export interface TenantWithMetrics extends Tenant {
  user_count: number;
  member_count: number;
}

/**
 * Payload for creating a new tenant via the provisioning wizard.
 * Matches the provision_tenant() RPC signature:
 *   p_nombre TEXT, p_slug TEXT, p_admin_email TEXT, p_admin_nombre TEXT, p_plan TEXT
 */
export interface ProvisionTenantPayload {
  nombre: string;
  slug: string;
  plan: TenantPlan;
  admin_email: string;
  admin_nombre: string;
}

/**
 * Payload for updating tenant settings.
 * Only includes columns that are safe to update directly.
 */
export interface UpdateTenantPayload {
  nombre?: string;
  slug?: string;
  logo_url?: string | null;
  color_primario?: string;
  color_secundario?: string | null;
  plan?: TenantPlan;
  activo?: boolean;
  max_usuarios?: number;
  max_miembros?: number;
  configuracion?: Record<string, unknown>;
}

/**
 * Preset brand colors for the color picker.
 */
export const PRESET_COLORS = [
  { hex: '#2D6A4F', label: 'Verde PEMOS' },
  { hex: '#1D4ED8', label: 'Azul' },
  { hex: '#7C3AED', label: 'Morado' },
  { hex: '#DC2626', label: 'Rojo' },
  { hex: '#EA580C', label: 'Naranja' },
  { hex: '#CA8A04', label: 'Dorado' },
  { hex: '#0D9488', label: 'Turquesa' },
  { hex: '#BE185D', label: 'Rosa' },
  { hex: '#4338CA', label: 'Indigo' },
  { hex: '#0369A1', label: 'Celeste' },
] as const;

/**
 * Plan display configuration.
 * Keys match the DB CHECK constraint values.
 */
export const PLAN_CONFIG: Record<TenantPlan, { label: string; color: string }> = {
  basico: { label: 'Basico', color: 'bg-gray-100 text-gray-800' },
  profesional: { label: 'Profesional', color: 'bg-blue-100 text-blue-800' },
  empresarial: { label: 'Empresarial', color: 'bg-purple-100 text-purple-800' },
};

/**
 * Status display configuration.
 * The DB uses a boolean `activo` field. These labels map boolean to display text.
 */
export const STATUS_CONFIG: Record<'active' | 'inactive', { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactivo', color: 'bg-red-100 text-red-800' },
};

/**
 * Converts the DB boolean `activo` field to a display status key.
 */
export function getStatusKey(activo: boolean): 'active' | 'inactive' {
  return activo ? 'active' : 'inactive';
}
