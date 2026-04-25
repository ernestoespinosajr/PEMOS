'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { TenantBrandingProvider } from '@/components/layout/tenant-branding-provider';
import { useSidebar } from '@/hooks/use-sidebar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
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
    <TenantBrandingProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
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
    </TenantBrandingProvider>
  );
}
