'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformSidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  isMobile: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

const navItems = [
  {
    title: 'Resumen',
    href: '/platform',
    icon: LayoutDashboard,
  },
  {
    title: 'Tenants',
    href: '/platform/tenants',
    icon: Building2,
  },
];

const bottomItems = [
  {
    title: 'Configuracion',
    href: '/platform/settings',
    icon: Settings,
  },
];

/**
 * PlatformSidebar
 *
 * Dedicated sidebar for the platform admin section.
 * Uses a neutral slate color scheme to visually distinguish
 * platform admin pages from tenant-branded dashboard pages.
 */
export function PlatformSidebar({
  isCollapsed,
  isMobileOpen,
  isMobile,
  onToggleCollapsed,
  onCloseMobile,
}: PlatformSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/platform') return pathname === '/platform';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand Area - Platform Admin */}
      <div
        className={cn(
          'flex h-header items-center border-b border-slate-200',
          isCollapsed && !isMobile ? 'justify-center px-space-2' : 'px-space-4'
        )}
      >
        <Link
          href="/platform"
          className="flex items-center gap-space-2"
          onClick={isMobile ? onCloseMobile : undefined}
        >
          <Image
            src="/logo.svg"
            alt="PEMOS Platform"
            width={28}
            height={28}
            className="flex-shrink-0"
          />
          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <span className="block text-sm font-bold text-slate-900">
                PEMOS
              </span>
              <span className="block text-xs text-slate-500">
                Plataforma
              </span>
            </div>
          )}
        </Link>

        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="ml-auto rounded-md p-space-1 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            aria-label="Cerrar menu"
          >
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Back to Dashboard */}
      <div className="border-b border-slate-200 px-space-2 py-space-2">
        <Link
          href="/"
          className={cn(
            'flex items-center rounded-md py-space-2 text-sm text-slate-600 transition-colors duration-hover hover:bg-slate-100 hover:text-slate-900',
            isCollapsed && !isMobile
              ? 'justify-center px-space-2'
              : 'gap-space-2 px-space-3'
          )}
          title={isCollapsed && !isMobile ? 'Volver al Dashboard' : undefined}
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          {(!isCollapsed || isMobile) && <span>Volver al Dashboard</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-space-4"
        aria-label="Menu de plataforma"
      >
        {(!isCollapsed || isMobile) && (
          <p className="mb-space-2 px-space-4 text-xs font-medium uppercase tracking-wide text-slate-400">
            Administracion
          </p>
        )}

        <ul role="list" className="space-y-space-1 px-space-2">
          {navItems.map((item) => {
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
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                  aria-current={active ? 'page' : undefined}
                  title={isCollapsed && !isMobile ? item.title : undefined}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-slate-700"
                      aria-hidden="true"
                    />
                  )}

                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" />

                  {(!isCollapsed || isMobile) && (
                    <span className="text-sm">{item.title}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-200 py-space-4">
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
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
        </ul>
      </div>

      {/* Collapse Toggle (Desktop only) */}
      {!isMobile && (
        <div className="border-t border-slate-200 p-space-2">
          <button
            onClick={onToggleCollapsed}
            className="flex w-full items-center justify-center rounded-md p-space-2 text-slate-400 transition-colors duration-hover hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
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
            'fixed left-0 top-0 z-30 h-screen border-r border-slate-200 bg-white transition-[width] duration-enter',
            isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
          )}
          aria-label="Barra lateral de administracion de plataforma"
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 animate-overlay-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          <aside
            className="fixed left-0 top-0 z-50 h-screen w-sidebar-mobile border-r border-slate-200 bg-white shadow-xl animate-sidebar-in"
            aria-label="Barra lateral de administracion de plataforma"
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
