/**
 * PEMOS Authentication & Authorization Type Definitions
 *
 * These types define the RBAC model used across the application.
 * Roles are stored in the `usuarios` table and injected into JWT
 * claims via the `custom_access_token_hook` Postgres function.
 */

/**
 * User roles in the PEMOS system, ordered by privilege level (highest first).
 *
 * - admin: Full system access, user management, configuration
 * - coordinator: Manages members, electoral operations within their geographic scope
 * - observer: Read-only access to electoral data and reports
 * - field_worker: Limited access for field data entry and member management
 */
export type UserRole = 'admin' | 'coordinator' | 'observer' | 'field_worker';

/**
 * Geographic hierarchy levels in the Dominican political system.
 * Each level narrows the user's data visibility scope.
 */
export type GeographicLevel =
  | 'provincia'
  | 'municipio'
  | 'circunscripcion'
  | 'sector'
  | 'comite'
  | 'nivel_intermedio';

/**
 * Defines the geographic boundary of a user's data access.
 * A user scoped to a municipio can only see data within that municipio.
 */
export interface GeographicScope {
  level: GeographicLevel;
  id: string;
}

/**
 * Custom JWT claims injected by the `custom_access_token_hook` function.
 * These are available in the decoded JWT on both client and server.
 */
export interface CustomClaims {
  role: UserRole;
  tenant_id: string;
  geographic_scope: GeographicScope | null;
}

/**
 * Authenticated user with PEMOS-specific claims.
 * Combines Supabase auth user identity with application-level RBAC data.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string;
  geographic_scope: GeographicScope | null;
}

/**
 * Permission actions that can be checked against user roles.
 */
export type PermissionAction =
  | 'manage_users'
  | 'view_all_data'
  | 'manage_members'
  | 'view_electoral'
  | 'manage_electoral'
  | 'manage_schedules'
  | 'manage_seguimiento'
  | 'generate_reports'
  | 'manage_report_archives';
