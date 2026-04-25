'use client';

import { useRouter } from 'next/navigation';
import { ProvisioningWizard } from '@/components/platform/provisioning-wizard';
import { createClient } from '@/lib/supabase/client';
import type { ProvisionTenantPayload } from '@/types/tenant';

/**
 * Platform Admin - New Tenant (Provisioning Wizard)
 *
 * Multi-step form for creating a new tenant/organization.
 * Calls the `provision_tenant` RPC which handles the full workflow
 * transactionally: creating the tenant record, admin user, and
 * optional geographic data seeding.
 */
export default function NuevoTenantPage() {
  const router = useRouter();

  async function handleComplete(payload: ProvisionTenantPayload) {
    const supabase = createClient();

    // Call the provisioning RPC
    // Matches provision_tenant(p_nombre, p_slug, p_admin_email, p_admin_nombre, p_plan)
    // Type assertion: RPC and tenants table added by ftr-011 migration
    const { data, error } = await (supabase as any).rpc('provision_tenant', {
      p_nombre: payload.nombre,
      p_slug: payload.slug,
      p_admin_email: payload.admin_email,
      p_admin_nombre: payload.admin_nombre,
      p_plan: payload.plan,
    });

    if (error) {
      throw new Error(error.message || 'Error al crear la organizacion');
    }

    // Redirect to tenant list on success
    router.push('/platform/tenants');
  }

  function handleCancel() {
    router.push('/platform/tenants');
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Nueva Organizacion
        </h1>
        <p className="mt-space-1 text-sm text-slate-500">
          Configura y crea una nueva organizacion en la plataforma PEMOS.
        </p>
      </div>

      {/* Wizard */}
      <div className="rounded-lg border border-slate-200 bg-white p-space-6 lg:p-space-8">
        <ProvisioningWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
