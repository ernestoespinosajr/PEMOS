'use client';

import { PlatformSidebar } from '@/components/platform/platform-sidebar';
import { Header } from '@/components/layout/header';
import { useSidebar } from '@/hooks/use-sidebar';
import { cn } from '@/lib/utils';

/**
 * PlatformLayout
 *
 * Layout for platform admin pages. Uses a neutral slate color scheme
 * and the PlatformSidebar to visually distinguish platform management
 * from tenant-branded dashboard pages.
 *
 * Auth guard: The middleware checks `canAccessRoute` for /platform/* routes,
 * which requires the `platform_admin` role. Non-platform-admins are
 * redirected to /forbidden.
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isCollapsed,
    isMobileOpen,
    isMobile,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50">
      <PlatformSidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        isMobile={isMobile}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={closeMobile}
      />

      {/* Main content area */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[margin-left] duration-enter',
          !isMobile && (isCollapsed ? 'ml-sidebar-collapsed' : 'ml-sidebar')
        )}
      >
        <Header
          isMobile={isMobile}
          onToggleMobile={toggleMobile}
        />

        <main
          id="main-content"
          className="flex-1 px-space-4 py-space-6 lg:px-space-6"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
