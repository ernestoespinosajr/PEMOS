import type { LucideIcon } from 'lucide-react';

/**
 * Navigation item for sidebar menu
 */
export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
}

/**
 * Navigation section grouping multiple nav items
 */
export interface NavSection {
  label: string;
  items: NavItem[];
}
