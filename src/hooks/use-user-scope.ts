'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ROLES } from '@/lib/auth/roles';
import { LEVEL_LABELS } from '@/types/hierarchy';
import type { UserRole, GeographicScope, GeographicLevel } from '@/types/auth';

// ---------- Types ----------

export interface UserScope {
  /** The user's PEMOS role. Null while loading or if not found. */
  role: UserRole | null;
  /** Spanish label for the role (e.g. "Administrador", "Coordinador"). */
  roleLabel: string;
  /** Geographic scope from JWT claims. Null for admins or when not assigned. */
  geographicScope: GeographicScope | null;
  /** Resolved name of the geographic area (e.g. "Santo Domingo Norte"). */
  scopeName: string | null;
  /** Full scope description for display (e.g. "Municipio: Santo Domingo Norte"). */
  scopeDescription: string | null;
  /** Dashboard title based on role context. */
  dashboardTitle: string;
  /** Dashboard subtitle based on role and scope. */
  dashboardSubtitle: string;
  /** Whether the user data is still loading. */
  isLoading: boolean;
  /** Error message if scope resolution fails. */
  error: string | null;
}

// ---------- Role-based display configuration ----------

interface RoleDashboardConfig {
  title: string;
  subtitle: string;
  subtitleWithScope: (scopeDescription: string) => string;
}

const ROLE_DASHBOARD_CONFIG: Record<UserRole, RoleDashboardConfig> = {
  platform_admin: {
    title: 'Panel de Plataforma',
    subtitle: 'Administracion global de la plataforma',
    subtitleWithScope: () => 'Administracion global de la plataforma',
  },
  admin: {
    title: 'Panel de Control',
    subtitle: 'Vista general del sistema',
    subtitleWithScope: () => 'Vista general del sistema',
  },
  coordinator: {
    title: 'Mi Area',
    subtitle: 'Metricas de tu area asignada',
    subtitleWithScope: (scope) => scope,
  },
  observer: {
    title: 'Panel de Observacion',
    subtitle: 'Datos electorales de tus recintos asignados',
    subtitleWithScope: () => 'Datos electorales de tus recintos asignados',
  },
  field_worker: {
    title: 'Mi Panel',
    subtitle: 'Resumen de actividad en campo',
    subtitleWithScope: () => 'Resumen de actividad en campo',
  },
};

// ---------- Geographic scope levels that map to tables ----------

/**
 * Maps geographic scope levels from auth to their Supabase table names.
 * Only the levels stored in the usuarios table are included.
 * Uses `as const` so the values are literal types matching the Database type.
 */
const SCOPE_LEVEL_TO_TABLE = {
  provincia: 'provincias',
  municipio: 'municipios',
  circunscripcion: 'circunscripciones',
} as const satisfies Partial<Record<GeographicLevel, string>>;

type ScopeTableName = (typeof SCOPE_LEVEL_TO_TABLE)[keyof typeof SCOPE_LEVEL_TO_TABLE];

// ---------- Hook ----------

/**
 * Hook that resolves the current authenticated user's role and geographic
 * scope for dashboard display purposes.
 *
 * The auth system stores app_role and geographic_scope in JWT custom claims
 * (injected by the `custom_access_token_hook` Postgres function). This hook:
 *
 * 1. Validates the user via `supabase.auth.getUser()`
 * 2. Decodes the JWT access token to extract `app_role` and `geographic_scope`
 * 3. If a geographic scope exists, resolves the area name from the database
 * 4. Returns display-ready strings for the dashboard header
 *
 * IMPORTANT: This hook is for UI display only. Data filtering is handled
 * entirely by RLS at the database level. The Supabase client includes the
 * JWT automatically, so all queries return role-scoped data without any
 * client-side filtering.
 */
export function useUserScope(): UserScope {
  const [role, setRole] = useState<UserRole | null>(null);
  const [geographicScope, setGeographicScope] = useState<GeographicScope | null>(null);
  const [scopeName, setScopeName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveScope() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Get the authenticated user -- getUser() validates the JWT server-side
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!cancelled) {
            setError('No se pudo obtener la sesion del usuario');
            setIsLoading(false);
          }
          return;
        }

        // Extract role and scope from JWT custom claims.
        // The custom_access_token_hook injects 'app_role' (NOT 'role') into the JWT.
        // To read these claims, we decode the access token from the session.
        let userRole: UserRole | null = null;
        let userGeoScope: GeographicScope | null = null;

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          try {
            const parts = session.access_token.split('.');
            const payloadBase64 = parts[1] ?? '';
            const payloadJson = atob(payloadBase64);
            const claims = JSON.parse(payloadJson);
            userRole = (claims.app_role as UserRole | undefined) ?? null;
            userGeoScope = (claims.geographic_scope as GeographicScope | undefined) ?? null;
          } catch {
            // If JWT decode fails, fall through to null values
          }
        }

        if (cancelled) return;

        setRole(userRole);
        setGeographicScope(userGeoScope);

        // Resolve geographic area name if scope is assigned
        if (userGeoScope?.id && userGeoScope?.level) {
          const tableName = SCOPE_LEVEL_TO_TABLE[
            userGeoScope.level as keyof typeof SCOPE_LEVEL_TO_TABLE
          ] as ScopeTableName | undefined;

          if (tableName) {
            const { data: geoData, error: geoError } = await supabase
              .from(tableName)
              .select('nombre')
              .eq('id', userGeoScope.id)
              .single();

            if (!cancelled) {
              if (geoError) {
                console.warn('Error resolving geographic scope name:', geoError.message);
                // Non-fatal: we still have the role, just no scope name
              } else if (geoData && 'nombre' in geoData) {
                setScopeName(geoData.nombre as string);
              }
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error resolving user scope:', err);
          setError('Error al resolver el alcance del usuario');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    resolveScope();

    return () => {
      cancelled = true;
    };
  }, []);

  // Build display strings
  const roleLabel = role ? ROLES[role].label : '';

  const scopeDescription = buildScopeDescription(geographicScope, scopeName);

  const config = role ? ROLE_DASHBOARD_CONFIG[role] : null;
  const dashboardTitle = config?.title ?? 'Dashboard';
  const dashboardSubtitle = scopeDescription
    ? config?.subtitleWithScope(scopeDescription) ?? ''
    : config?.subtitle ?? 'Resumen general del sistema de monitoreo electoral';

  return {
    role,
    roleLabel,
    geographicScope,
    scopeName,
    scopeDescription,
    dashboardTitle,
    dashboardSubtitle,
    isLoading,
    error,
  };
}

// ---------- Helpers ----------

/**
 * Builds a human-readable scope description from the geographic scope.
 * Example: "Municipio: Santo Domingo Norte"
 */
function buildScopeDescription(
  scope: GeographicScope | null,
  name: string | null
): string | null {
  if (!scope || !name) return null;

  const levelLabel = LEVEL_LABELS[scope.level]?.singular;
  if (!levelLabel) return name;

  return `${levelLabel}: ${name}`;
}
