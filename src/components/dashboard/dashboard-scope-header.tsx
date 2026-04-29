'use client';

import { Shield, MapPin, Eye, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/auth';

// ---------- Types ----------

interface DashboardScopeHeaderProps {
  /** The user's role. Null while loading. */
  role: UserRole | null;
  /** Spanish label for the role (e.g. "Administrador"). */
  roleLabel: string;
  /** Dashboard title based on role (e.g. "Panel de Control"). */
  title: string;
  /** Dashboard subtitle / scope description. */
  subtitle: string;
  /** Whether the scope data is still loading. */
  isLoading?: boolean;
  /** Name of the movimiento the user is scoped to. Null if not scoped. */
  movimientoNombre?: string | null;
}

// ---------- Role visual configuration ----------

interface RoleVisualConfig {
  icon: React.ElementType;
  /** Badge background color class. */
  badgeBg: string;
  /** Badge text color class. */
  badgeText: string;
  /** Badge icon color class. */
  badgeIcon: string;
}

const ROLE_VISUALS: Record<UserRole, RoleVisualConfig> = {
  platform_admin: {
    icon: Shield,
    badgeBg: 'bg-primary-tint',
    badgeText: 'text-primary',
    badgeIcon: 'text-primary',
  },
  admin: {
    icon: Shield,
    badgeBg: 'bg-primary-tint',
    badgeText: 'text-primary',
    badgeIcon: 'text-primary',
  },
  supervisor: {
    icon: MapPin,
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeIcon: 'text-teal-600',
  },
  coordinator: {
    icon: MapPin,
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeIcon: 'text-blue-600',
  },
  observer: {
    icon: Eye,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeIcon: 'text-amber-600',
  },
  field_worker: {
    icon: Briefcase,
    badgeBg: 'bg-neutral-100',
    badgeText: 'text-body-text',
    badgeIcon: 'text-placeholder',
  },
};

// ---------- Component ----------

/**
 * Role-scoped dashboard header that displays contextual messaging based
 * on the authenticated user's role and geographic scope.
 *
 * Displays:
 * - A role badge with icon (e.g. shield for admin, map pin for coordinator)
 * - The role-specific dashboard title
 * - The scope description (geographic area for coordinators, generic for others)
 *
 * Accessibility:
 * - Uses semantic heading hierarchy (h2 for title)
 * - Role badge includes sr-only text for screen readers
 * - Loading state uses aria-busy and skeleton placeholders
 *
 * Design:
 * - Follows existing dashboard header pattern (mb-space-8, text-2xl heading)
 * - Role badge uses semantic color coding per role
 * - Lightweight: no data fetching, display-only based on props from useUserScope
 */
export function DashboardScopeHeader({
  role,
  roleLabel,
  title,
  subtitle,
  isLoading = false,
  movimientoNombre,
}: DashboardScopeHeaderProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="mb-space-8" aria-busy="true" aria-label="Cargando informacion del usuario">
        <div className="flex items-center gap-space-3">
          <div className="h-7 w-28 animate-pulse rounded-full bg-neutral-100" />
        </div>
        <div className="mt-space-2 h-8 w-52 animate-pulse rounded bg-neutral-100" />
        <div className="mt-space-1 h-4 w-72 animate-pulse rounded bg-neutral-100" />
      </div>
    );
  }

  const visuals = role ? ROLE_VISUALS[role] : null;
  const RoleIcon = visuals?.icon ?? Shield;

  return (
    <div className="mb-space-8">
      {/* Role Badge */}
      {role && roleLabel && (
        <div className="mb-space-2">
          <span
            className={cn(
              'inline-flex items-center gap-space-1 rounded-full px-space-3 py-space-1 text-xs font-medium',
              visuals?.badgeBg ?? 'bg-neutral-100',
              visuals?.badgeText ?? 'text-body-text'
            )}
          >
            <RoleIcon
              size={12}
              strokeWidth={2}
              className={visuals?.badgeIcon ?? 'text-placeholder'}
              aria-hidden="true"
            />
            {roleLabel}
            <span className="sr-only">: rol del usuario</span>
          </span>
        </div>
      )}

      {/* Dashboard Title */}
      <h2 className="text-2xl font-bold tracking-tight text-primary-text">
        {movimientoNombre ? `${title} — ${movimientoNombre}` : title}
      </h2>

      {/* Scope Description */}
      <p className="mt-space-1 text-sm text-secondary-text">
        {subtitle}
      </p>
    </div>
  );
}
