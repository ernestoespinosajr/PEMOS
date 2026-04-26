/**
 * Tenant Branding Utility
 *
 * Fetches the current tenant's branding configuration from Supabase
 * and applies CSS custom property overrides to replace the default
 * PEMOS green palette with the tenant's brand color.
 *
 * The branding system only overrides the accent/primary color. Typography,
 * spacing, shadows, and neutrals remain consistent across all tenants
 * for UX coherence.
 */

import type { TenantBranding } from '@/types/tenant';

/**
 * Default PEMOS branding (green palette).
 * Used as fallback when no tenant branding is configured.
 */
export const DEFAULT_BRANDING: TenantBranding = {
  nombre: 'PEMOS',
  logo_url: null,
  color_primario: '#2D6A4F',
  color_secundario: null,
};

/**
 * Converts a hex color to HSL values string (e.g., "155 43% 30%")
 * compatible with the Shadcn/ui CSS variable format.
 */
export function hexToHSL(hex: string): string {
  // Remove # prefix
  const cleanHex = hex.replace('#', '');

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/**
 * Generates a lighter tint of a color for backgrounds.
 * Increases lightness to ~90% while preserving hue and reducing saturation.
 */
export function generateTintHSL(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;

  if (max !== min) {
    const d = max - min;

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  // Tint: high lightness, moderate saturation for a pastel background
  return `${hDeg} 56% 90%`;
}

/**
 * Generates a darker shade of a color for headings.
 * Decreases lightness to ~17% while preserving hue.
 */
export function generateDarkHSL(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;

  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  return `${hDeg} 50% 17%`;
}

/**
 * Generates a lighter variant of a color for hover states.
 * Slightly lighter than the primary but darker than the tint.
 */
export function generateLightHSL(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  // Slightly lighter than primary
  const lPercent = Math.min(Math.round(l * 100) + 10, 60);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/**
 * Applies tenant branding CSS custom properties to the document root.
 * Overrides the Shadcn/ui primary color variables.
 *
 * Only the accent/primary color family is overridden. Neutrals, semantic
 * colors, typography, and spacing remain unchanged.
 */
export function applyBranding(branding: TenantBranding): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const color = branding.color_primario || DEFAULT_BRANDING.color_primario;

  // Only override if different from default
  if (color === DEFAULT_BRANDING.color_primario) {
    // Remove any previously applied overrides
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-foreground');
    root.style.removeProperty('--sidebar-primary');
    root.style.removeProperty('--sidebar-accent');
    root.style.removeProperty('--sidebar-accent-foreground');
    root.style.removeProperty('--sidebar-ring');
    return;
  }

  const primaryHSL = hexToHSL(color);
  const tintHSL = generateTintHSL(color);
  const lightHSL = generateLightHSL(color);

  // Override Shadcn/ui CSS custom properties
  root.style.setProperty('--primary', primaryHSL);
  root.style.setProperty('--ring', primaryHSL);
  root.style.setProperty('--accent', tintHSL);
  root.style.setProperty('--accent-foreground', primaryHSL);

  // Override sidebar-specific variables
  root.style.setProperty('--sidebar-primary', primaryHSL);
  root.style.setProperty('--sidebar-accent', tintHSL);
  root.style.setProperty('--sidebar-accent-foreground', primaryHSL);
  root.style.setProperty('--sidebar-ring', primaryHSL);

  // Store the light variant for hover states
  root.style.setProperty('--primary-light-hsl', lightHSL);
}

/**
 * Removes all tenant branding overrides, restoring default PEMOS palette.
 */
export function clearBranding(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-foreground');
  root.style.removeProperty('--sidebar-primary');
  root.style.removeProperty('--sidebar-accent');
  root.style.removeProperty('--sidebar-accent-foreground');
  root.style.removeProperty('--sidebar-ring');
  root.style.removeProperty('--primary-light-hsl');
}

/**
 * Validates that a hex color meets minimum contrast ratio against white text.
 * Uses the WCAG 2.1 relative luminance formula.
 *
 * @param hex - The hex color to check
 * @returns true if the color meets 4.5:1 contrast ratio with white
 */
export function meetsContrastRequirement(hex: string): boolean {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // sRGB to linear
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // White luminance = 1.0
  const contrastRatio = (1.0 + 0.05) / (luminance + 0.05);

  return contrastRatio >= 4.5;
}

/**
 * Calculates the contrast ratio between a color and white.
 *
 * @param hex - The hex color to check
 * @returns The contrast ratio (e.g., 4.5)
 */
export function getContrastRatio(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return Number(((1.0 + 0.05) / (luminance + 0.05)).toFixed(2));
}

/**
 * Validates a hex color string.
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
