'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flag,
  LayoutDashboard,
  LogOut,
  MapPin,
  Monitor,
  Network,
  Settings,
  FileText,
  UserSearch,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantBranding } from '@/components/layout/tenant-branding-provider';
import type { NavSection } from '@/types';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  isMobile: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

const navSections: NavSection[] = [
  {
    label: 'Menu Principal',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
      },
      {
        title: 'Miembros',
        href: '/miembros',
        icon: Users,
      },
      {
        title: 'Movimientos',
        href: '/movimientos',
        icon: Building2,
      },
      {
        title: 'Jerarquia',
        href: '/jerarquia',
        icon: Network,
      },
    ],
  },
  {
    label: 'Electoral',
    items: [
      {
        title: 'Monitoreo',
        href: '/monitoreo',
        icon: Monitor,
      },
      {
        title: 'Recintos',
        href: '/recintos',
        icon: MapPin,
      },
      {
        title: 'Candidatos',
        href: '/candidatos',
        icon: Flag,
      },
      {
        title: 'No Inscritos',
        href: '/seguimiento',
        icon: UserSearch,
      },
      {
        title: 'Cronograma',
        href: '/cronograma',
        icon: CalendarDays,
      },
    ],
  },
  {
    label: 'Reportes',
    items: [
      {
        title: 'Reportes',
        href: '/reportes',
        icon: ClipboardList,
      },
      {
        title: 'Informes',
        href: '/informes',
        icon: FileText,
      },
      {
        title: 'Estadisticas',
        href: '/estadisticas',
        icon: BarChart3,
      },
    ],
  },
];

const bottomItems = [
  {
    title: 'Configuracion',
    href: '/configuracion',
    icon: Settings,
  },
];

export function Sidebar({
  isCollapsed,
  isMobileOpen,
  isMobile,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { branding } = useTenantBranding();

  const [appRole, setAppRole] = useState<string | null>(null);
  const [movimientoId, setMovimientoId] = useState<string | null>(null);
  const [movimientoNombre, setMovimientoNombre] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadClaims() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;

        const parts = session.access_token.split('.');
        const claims = JSON.parse(atob(parts[1] ?? ''));
        const role = (claims.app_role as string) ?? null;
        const movId = (claims.movimiento_id as string | null) ?? null;

        if (cancelled) return;
        setAppRole(role);
        setMovimientoId(movId);

        if (movId) {
          try {
            const res = await fetch(`/api/movimientos/${movId}`);
            if (res.ok) {
              const json = await res.json();
              if (!cancelled) {
                setMovimientoNombre(json.movimiento?.nombre ?? null);
              }
            }
          } catch {
            // Non-fatal
          }
        }
      } catch {
        // Non-fatal
      }
    }

    loadClaims();
    return () => { cancelled = true; };
  }, []);

  const isAdminWithoutMovimiento =
    (appRole === 'admin' || appRole === 'platform_admin') && !movimientoId;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const logoSrc = branding.logo_url || '/logo.svg';
  const brandName = branding.nombre || 'PEMOS';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand Area */}
      <div
        className={cn(
          'flex h-header items-center',
          isCollapsed && !isMobile ? 'justify-center px-space-2' : 'px-space-4'
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-space-2 min-w-0"
          onClick={isMobile ? onCloseMobile : undefined}
        >
          <Image
            src={logoSrc}
            alt={brandName}
            width={28}
            height={28}
            className="flex-shrink-0 rounded"
            onError={(e) => {
              const target = e.currentTarget;
              target.src = '/logo.svg';
            }}
          />
          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <span className="block truncate text-lg font-bold text-primary-text">
                {brandName}
              </span>
              {movimientoNombre && (
                <span className="block truncate text-xs text-secondary-text font-normal">
                  {movimientoNombre}
                </span>
              )}
            </div>
          )}
        </Link>

        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="ml-auto rounded-md p-space-1 text-body-text hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Cerrar menu"
          >
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-space-4"
        aria-label="Menu principal"
      >
        {navSections.map((section) => (
          <div key={section.label} className="mb-space-2">
            {/* Section Label */}
            {(!isCollapsed || isMobile) && (
              <p className="mb-space-2 mt-space-6 px-space-4 text-xs font-medium uppercase tracking-wide text-placeholder first:mt-0">
                {section.label}
              </p>
            )}

            {/* Section Items */}
            <ul role="list" className="space-y-space-1 px-space-2">
              {section.items.filter((item) => {
                if (item.href === '/movimientos') {
                  return isAdminWithoutMovimiento;
                }
                return true;
              }).map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={isMobile ? onCloseMobile : undefined}
                      className={cn(
                        'group relative flex items-center rounded-md py-space-3 transition-colors duration-hover',
                        isCollapsed && !isMobile
                          ? 'justify-center px-space-2'
                          : 'gap-space-3 px-space-4',
                        active
                          ? 'bg-primary-tint font-medium text-primary'
                          : 'text-body-text hover:bg-neutral-100 hover:text-primary-text'
                      )}
                      aria-current={active ? 'page' : undefined}
                      title={isCollapsed && !isMobile ? item.title : undefined}
                    >
                      {/* Active indicator - left border */}
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                          aria-hidden="true"
                        />
                      )}

                      <span className="relative flex-shrink-0">
                        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                        {/* Notification Badge */}
                        {item.badge != null && item.badge > 0 && (
                          <span
                            className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-notification px-1 text-xs font-bold text-white"
                            aria-label={`${item.badge} notificaciones`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </span>

                      {(!isCollapsed || isMobile) && (
                        <span className="text-sm">{item.title}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border py-space-4">
        <ul role="list" className="space-y-space-1 px-space-2">
          {bottomItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={isMobile ? onCloseMobile : undefined}
                  className={cn(
                    'group flex items-center rounded-md py-space-3 transition-colors duration-hover',
                    isCollapsed && !isMobile
                      ? 'justify-center px-space-2'
                      : 'gap-space-3 px-space-4',
                    active
                      ? 'bg-primary-tint font-medium text-primary'
                      : 'text-body-text hover:bg-neutral-100 hover:text-primary-text'
                  )}
                  aria-current={active ? 'page' : undefined}
                  title={isCollapsed && !isMobile ? item.title : undefined}
                >
                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  {(!isCollapsed || isMobile) && (
                    <span className="text-sm">{item.title}</span>
                  )}
                </Link>
              </li>
            );
          })}

          {/* Cerrar Sesion */}
          <li>
            <button
              onClick={handleSignOut}
              className={cn(
                'group flex w-full items-center rounded-md py-space-3 text-body-text transition-colors duration-hover hover:bg-neutral-100 hover:text-primary-text',
                isCollapsed && !isMobile
                  ? 'justify-center px-space-2'
                  : 'gap-space-3 px-space-4'
              )}
              title={isCollapsed && !isMobile ? 'Cerrar Sesion' : undefined}
            >
              <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
              {(!isCollapsed || isMobile) && (
                <span className="text-sm">Cerrar Sesion</span>
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Collapse Toggle (Desktop only) */}
      {!isMobile && (
        <div className="border-t border-border p-space-2">
          <button
            onClick={onToggleCollapsed}
            className="flex w-full items-center justify-center rounded-md p-space-2 text-placeholder transition-colors duration-hover hover:bg-neutral-100 hover:text-body-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={
              isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'
            }
          >
            {isCollapsed ? (
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            'fixed left-0 top-0 z-30 h-screen border-r border-border bg-surface transition-[width] duration-enter',
            isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
          )}
          aria-label="Barra lateral de navegacion"
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 animate-overlay-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Mobile Sidebar Panel */}
          <aside
            className="fixed left-0 top-0 z-50 h-screen w-sidebar-mobile border-r border-border bg-surface shadow-xl animate-sidebar-in"
            aria-label="Barra lateral de navegacion"
            role="dialog"
            aria-modal="true"
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
