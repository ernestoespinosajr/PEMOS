'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  applyBranding,
  clearBranding,
  DEFAULT_BRANDING,
} from '@/lib/tenant/branding';
import type { TenantBranding } from '@/types/tenant';

// ---------- Context ----------

interface TenantBrandingContextValue {
  /** Current tenant branding configuration */
  branding: TenantBranding;
  /** Whether branding is still loading */
  isLoading: boolean;
  /** Error message if branding fetch failed */
  error: string | null;
  /** Force refresh branding from the database */
  refreshBranding: () => Promise<void>;
}

const TenantBrandingContext = createContext<TenantBrandingContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
  error: null,
  refreshBranding: async () => {},
});

/**
 * Hook to access the current tenant's branding.
 */
export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}

// ---------- Provider ----------

interface TenantBrandingProviderProps {
  children: React.ReactNode;
}

/**
 * TenantBrandingProvider
 *
 * Wraps the application and fetches the current tenant's branding
 * configuration on mount. Applies CSS custom property overrides to
 * the document root so the entire UI reflects the tenant's brand color.
 *
 * The branding is determined by:
 * 1. Reading the tenant_id from the user's JWT claims
 * 2. Fetching the tenant record from the `tenants` table
 * 3. Applying CSS overrides via the branding utility
 *
 * Falls back gracefully to the default PEMOS green palette if:
 * - No tenant_id is found in JWT
 * - The tenant record has no custom branding
 * - The fetch fails for any reason
 */
export function TenantBrandingProvider({ children }: TenantBrandingProviderProps) {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranding = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get authenticated user to extract tenant_id from JWT claims
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        // Not authenticated -- use default branding (login page etc.)
        setBranding(DEFAULT_BRANDING);
        clearBranding();
        setIsLoading(false);
        return;
      }

      const tenantId =
        (user.app_metadata?.tenant_id as string | undefined) ??
        (user.user_metadata?.tenant_id as string | undefined);

      if (!tenantId) {
        // No tenant_id in JWT -- platform admin or misconfigured user
        setBranding(DEFAULT_BRANDING);
        clearBranding();
        setIsLoading(false);
        return;
      }

      // Fetch tenant branding from database
      // Type assertion: 'tenants' table is added by ftr-011 migration
      // and may not be in generated Supabase types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenant, error: tenantError } = await (supabase as any)
        .from('tenants')
        .select('nombre, logo_url, color_primario, color_secundario')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        // Tenant not found -- use default
        console.warn('Could not fetch tenant branding:', tenantError?.message);
        setBranding(DEFAULT_BRANDING);
        clearBranding();
        setIsLoading(false);
        return;
      }

      const t = tenant as {
        nombre: string;
        logo_url: string | null;
        color_primario: string;
        color_secundario: string | null;
      };

      const tenantBranding: TenantBranding = {
        nombre: t.nombre || DEFAULT_BRANDING.nombre,
        logo_url: t.logo_url || null,
        color_primario: t.color_primario || DEFAULT_BRANDING.color_primario,
        color_secundario: t.color_secundario || null,
      };

      setBranding(tenantBranding);
      applyBranding(tenantBranding);
    } catch (err) {
      console.error('Error fetching tenant branding:', err);
      setError('Error al cargar la marca del tenant');
      setBranding(DEFAULT_BRANDING);
      clearBranding();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();

    // Cleanup: remove branding overrides on unmount
    return () => {
      clearBranding();
    };
  }, [fetchBranding]);

  return (
    <TenantBrandingContext.Provider
      value={{
        branding,
        isLoading,
        error,
        refreshBranding: fetchBranding,
      }}
    >
      {children}
    </TenantBrandingContext.Provider>
  );
}
