'use client';

import { Bell, Menu, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  isMobile: boolean;
  onToggleMobile: () => void;
}

export function Header({ title, isMobile, onToggleMobile }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-header items-center border-b border-border bg-surface px-space-4 lg:px-space-6'
      )}
      role="banner"
    >
      {/* Mobile: Hamburger */}
      {isMobile && (
        <button
          onClick={onToggleMobile}
          className="mr-space-3 rounded-md p-space-2 text-body-text hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
          aria-label="Abrir menu de navegacion"
        >
          <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}

      {/* Page Title */}
      <h1
        className={cn(
          'text-lg font-semibold text-primary-text',
          isMobile && 'text-center flex-1'
        )}
      >
        {title}
      </h1>

      {/* Right Section */}
      <div className="ml-auto flex items-center gap-space-3">
        {/* Notification Bell */}
        <button
          className="relative rounded-md p-space-2 text-body-text transition-colors duration-hover hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Notificaciones"
        >
          <Bell size={20} strokeWidth={1.5} aria-hidden="true" />
          {/* Notification dot */}
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-notification"
            aria-hidden="true"
          />
        </button>

        {/* User Avatar */}
        <button
          className="flex items-center gap-space-2 rounded-md p-space-1 transition-colors duration-hover hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Menu de usuario"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-primary">
            <User size={16} strokeWidth={1.5} aria-hidden="true" />
          </div>
          {!isMobile && (
            <span className="text-sm font-medium text-body-text">Usuario</span>
          )}
        </button>
      </div>
    </header>
  );
}
