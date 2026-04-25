'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TenantTable } from '@/components/platform/tenant-table';
import { Plus, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { TenantWithMetrics } from '@/types/tenant';

/**
 * Platform Admin - Tenant List Page
 *
 * Displays all tenants in a table with name, plan, status, user count,
 * and member count. Supports search filtering and navigation to tenant
 * detail/edit pages and the provisioning wizard.
 */
export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch tenants -- in production this would use a view or RPC
      // that includes user_count and member_count aggregations.
      // Type assertion: 'tenants' table added by ftr-011 migration
      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tenants:', error.message);
        setTenants([]);
        return;
      }

      // Map to TenantWithMetrics (counts would come from a view in production)
      const tenantsWithMetrics: TenantWithMetrics[] = ((data as any[]) ?? []).map((t: any) => ({
        id: t.id,
        nombre: t.nombre ?? '',
        slug: t.slug ?? '',
        logo_url: t.logo_url ?? null,
        color_primario: t.color_primario ?? '#2D6A4F',
        color_secundario: t.color_secundario ?? null,
        plan: t.plan ?? 'basico',
        activo: t.activo ?? true,
        max_usuarios: t.max_usuarios ?? 50,
        max_miembros: t.max_miembros ?? 10000,
        configuracion: (t.configuracion as Record<string, unknown>) ?? {},
        created_at: t.created_at ?? '',
        updated_at: t.updated_at ?? '',
        user_count: 0,
        member_count: 0,
      }));

      setTenants(tenantsWithMetrics);
    } catch (err) {
      console.error('Error loading tenants:', err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Filter tenants by search query
  const filteredTenants = searchQuery
    ? tenants.filter(
        (t) =>
          t.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tenants;

  function handleView(tenant: TenantWithMetrics) {
    router.push(`/platform/tenants/${tenant.id}`);
  }

  function handleEdit(tenant: TenantWithMetrics) {
    router.push(`/platform/tenants/${tenant.id}`);
  }

  async function handleToggleStatus(tenant: TenantWithMetrics) {
    const newActivo = !tenant.activo;

    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('tenants')
        .update({ activo: newActivo })
        .eq('id', tenant.id);

      if (error) {
        console.error('Error updating tenant status:', error.message);
        return;
      }

      // Refresh the list
      fetchTenants();
    } catch (err) {
      console.error('Error toggling tenant status:', err);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organizaciones
        </h1>
        <p className="mt-space-1 text-sm text-slate-500">
          Gestiona los partidos y organizaciones de la plataforma.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-space-6 flex flex-col gap-space-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar por nombre o slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Buscar organizaciones"
          />
        </div>

        {/* Create Button */}
        <Button
          onClick={() => router.push('/platform/tenants/nuevo')}
          className="bg-slate-800 hover:bg-slate-700"
        >
          <Plus size={16} className="mr-1" aria-hidden="true" />
          Crear Organizacion
        </Button>
      </div>

      {/* Tenant Table */}
      <TenantTable
        tenants={filteredTenants}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
      />

      {/* Count */}
      {!loading && (
        <p className="mt-space-4 text-xs text-slate-400">
          {filteredTenants.length} organizacion{filteredTenants.length !== 1 ? 'es' : ''}
          {searchQuery && ` encontrada${filteredTenants.length !== 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  );
}
