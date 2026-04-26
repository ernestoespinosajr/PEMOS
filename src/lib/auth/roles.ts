import type { UserRole, PermissionAction } from '@/types/auth';

/**
 * Role definitions with display metadata.
 * Ordered by privilege level (highest first).
 */
export const ROLES = {
  platform_admin: {
    key: 'platform_admin' as const,
    label: 'Admin Plataforma',
    description: 'Gestion de tenants y configuracion de la plataforma',
    level: -1,
  },
  admin: {
    key: 'admin' as const,
    label: 'Administrador',
    description: 'Acceso completo al sistema',
    level: 0,
  },
  coordinator: {
    key: 'coordinator' as const,
    label: 'Coordinador',
    description: 'Gestiona miembros y operaciones electorales',
    level: 1,
  },
  observer: {
    key: 'observer' as const,
    label: 'Observador',
    description: 'Acceso de lectura a datos electorales',
    level: 2,
  },
  field_worker: {
    key: 'field_worker' as const,
    label: 'Trabajador de Campo',
    description: 'Entrada de datos y gestion de miembros en campo',
    level: 3,
  },
} as const;

/**
 * Permission matrix: maps each action to the roles that are allowed
 * to perform it.
 */
const PERMISSION_MATRIX: Record<PermissionAction, readonly UserRole[]> = {
  manage_users: ['platform_admin', 'admin'],
  view_all_data: ['platform_admin', 'admin', 'coordinator'],
  manage_members: ['platform_admin', 'admin', 'coordinator', 'field_worker'],
  view_electoral: ['platform_admin', 'admin', 'coordinator', 'observer'],
  manage_electoral: ['platform_admin', 'admin', 'coordinator'],
  manage_schedules: ['platform_admin', 'admin', 'coordinator'],
  manage_seguimiento: ['platform_admin', 'admin', 'coordinator', 'field_worker'],
  generate_reports: ['platform_admin', 'admin', 'coordinator', 'observer'],
  manage_report_archives: ['platform_admin', 'admin', 'coordinator'],
  manage_tenants: ['platform_admin'],
  manage_platform: ['platform_admin'],
};

/**
 * Route permission map: defines which roles can access each route pattern.
 * Patterns are matched from most specific to least specific.
 * Routes not listed here are accessible to all authenticated users.
 */
const ROUTE_PERMISSIONS: Array<{
  pattern: RegExp;
  roles: readonly UserRole[];
}> = [
  // Platform admin-only routes (cross-tenant management)
  {
    pattern: /^\/platform/,
    roles: ['platform_admin'],
  },
  // Admin-only routes
  {
    pattern: /^\/configuracion\/usuarios/,
    roles: ['platform_admin', 'admin'],
  },
  {
    pattern: /^\/configuracion\/organizacion/,
    roles: ['platform_admin', 'admin'],
  },
  {
    pattern: /^\/configuracion\/sistema/,
    roles: ['platform_admin', 'admin'],
  },
  // Observer assignment management -- admin only
  {
    pattern: /^\/monitoreo\/asignaciones/,
    roles: ['platform_admin', 'admin'],
  },
  // Coordinator and above
  {
    pattern: /^\/miembros\/(nuevo|editar)/,
    roles: ['platform_admin', 'admin', 'coordinator', 'field_worker'],
  },
  {
    pattern: /^\/recintos\/(nuevo|editar)/,
    roles: ['platform_admin', 'admin', 'coordinator'],
  },
  {
    pattern: /^\/candidatos\/(nuevo|editar)/,
    roles: ['platform_admin', 'admin', 'coordinator'],
  },
  // Vote recording -- admin, coordinator, observer
  {
    pattern: /^\/monitoreo\/votos/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  // Acta creation -- admin, coordinator, observer
  {
    pattern: /^\/monitoreo\/actas\/nuevo/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  // Acta list -- admin, coordinator, observer
  {
    pattern: /^\/monitoreo\/actas/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  // Turnout tracking -- admin, coordinator, observer
  {
    pattern: /^\/monitoreo\/turnout/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  // Electoral monitoring hub -- observer and above
  {
    pattern: /^\/monitoreo/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  // Recinto and candidato views -- observer and above
  {
    pattern: /^\/recintos/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  {
    pattern: /^\/candidatos/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  // Reports -- all roles with electoral access
  {
    pattern: /^\/reportes\/archivo/,
    roles: ['platform_admin', 'admin', 'coordinator'],
  },
  {
    pattern: /^\/reportes/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  {
    pattern: /^\/informes/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  {
    pattern: /^\/estadisticas/,
    roles: ['platform_admin', 'admin', 'coordinator', 'observer'],
  },
  // Seguimiento no inscritos -- template management (admin only)
  {
    pattern: /^\/seguimiento\/plantillas/,
    roles: ['platform_admin', 'admin'],
  },
  // Seguimiento no inscritos -- queue and recording
  {
    pattern: /^\/seguimiento/,
    roles: ['platform_admin', 'admin', 'coordinator', 'field_worker'],
  },
];

/**
 * Checks if a given role can access a specific route.
 *
 * @param role - The user's role
 * @param pathname - The URL pathname to check
 * @returns true if the role has access to the route
 */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  // Find the first matching route pattern
  const matchedRoute = ROUTE_PERMISSIONS.find((route) =>
    route.pattern.test(pathname)
  );

  // If no pattern matches, the route is accessible to all authenticated users
  if (!matchedRoute) {
    return true;
  }

  return matchedRoute.roles.includes(role);
}

/**
 * Checks if a role has a specific permission.
 *
 * @param role - The user's role
 * @param action - The permission action to check
 * @returns true if the role is allowed to perform the action
 */
export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  const allowedRoles = PERMISSION_MATRIX[action];
  return allowedRoles.includes(role);
}

/**
 * Checks if one role has equal or higher privilege than another.
 *
 * @param role - The role to check
 * @param requiredRole - The minimum required role
 * @returns true if `role` has equal or higher privilege than `requiredRole`
 */
export function isRoleAtLeast(role: UserRole, requiredRole: UserRole): boolean {
  return ROLES[role].level <= ROLES[requiredRole].level;
}
