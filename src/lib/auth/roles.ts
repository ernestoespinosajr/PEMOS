import type { UserRole, PermissionAction } from '@/types/auth';

/**
 * Role definitions with display metadata.
 * Ordered by privilege level (highest first).
 */
export const ROLES = {
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
  manage_users: ['admin'],
  view_all_data: ['admin', 'coordinator'],
  manage_members: ['admin', 'coordinator', 'field_worker'],
  view_electoral: ['admin', 'coordinator', 'observer'],
  manage_electoral: ['admin', 'coordinator'],
  manage_schedules: ['admin', 'coordinator'],
  manage_seguimiento: ['admin', 'coordinator', 'field_worker'],
  generate_reports: ['admin', 'coordinator', 'observer'],
  manage_report_archives: ['admin', 'coordinator'],
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
  // Admin-only routes
  {
    pattern: /^\/configuracion\/usuarios/,
    roles: ['admin'],
  },
  {
    pattern: /^\/configuracion\/sistema/,
    roles: ['admin'],
  },
  // Observer assignment management -- admin only
  {
    pattern: /^\/monitoreo\/asignaciones/,
    roles: ['admin'],
  },
  // Coordinator and above
  {
    pattern: /^\/miembros\/(nuevo|editar)/,
    roles: ['admin', 'coordinator', 'field_worker'],
  },
  {
    pattern: /^\/recintos\/(nuevo|editar)/,
    roles: ['admin', 'coordinator'],
  },
  {
    pattern: /^\/candidatos\/(nuevo|editar)/,
    roles: ['admin', 'coordinator'],
  },
  // Vote recording -- admin, coordinator, observer
  {
    pattern: /^\/monitoreo\/votos/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  // Acta creation -- admin, coordinator, observer
  {
    pattern: /^\/monitoreo\/actas\/nuevo/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  // Acta list -- admin, coordinator, observer
  {
    pattern: /^\/monitoreo\/actas/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  // Turnout tracking -- admin, coordinator, observer
  {
    pattern: /^\/monitoreo\/turnout/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  // Electoral monitoring hub -- observer and above
  {
    pattern: /^\/monitoreo/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  // Recinto and candidato views -- observer and above
  {
    pattern: /^\/recintos/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  {
    pattern: /^\/candidatos/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  // Reports -- all roles with electoral access
  {
    pattern: /^\/reportes\/archivo/,
    roles: ['admin', 'coordinator'],
  },
  {
    pattern: /^\/reportes/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  {
    pattern: /^\/informes/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  {
    pattern: /^\/estadisticas/,
    roles: ['admin', 'coordinator', 'observer'],
  },
  // Seguimiento no inscritos -- template management (admin only)
  {
    pattern: /^\/seguimiento\/plantillas/,
    roles: ['admin'],
  },
  // Seguimiento no inscritos -- queue and recording
  {
    pattern: /^\/seguimiento/,
    roles: ['admin', 'coordinator', 'field_worker'],
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
