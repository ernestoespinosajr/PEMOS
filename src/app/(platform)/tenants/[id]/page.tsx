'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TenantForm } from '@/components/platform/tenant-form';
import { TenantUsageCard } from '@/components/platform/tenant-usage-card';
import { ArrowLeft, Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { STATUS_CONFIG, PLAN_CONFIG, getStatusKey, type Tenant } from '@/types/tenant';

/**
 * Platform Admin - Tenant Detail Page
 *
 * View and edit individual tenant settings including branding (color picker,
 * logo), plan, status, and usage metrics.
 */
export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      // Type assertion: 'tenants' table added by ftr-011 migration
      const { data, error } = await (supabase as any)
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error || !data) {
        console.error('Error fetching tenant:', error?.message);
        setTenant(null);
        return;
      }

      const d = data as any;
      setTenant({
        id: d.id,
        nombre: d.nombre ?? '',
        slug: d.slug ?? '',
        logo_url: d.logo_url ?? null,
        color_primario: d.color_primario ?? '#2D6A4F',
        color_secundario: d.color_secundario ?? null,
        plan: d.plan ?? 'basico',
        activo: d.activo ?? true,
        max_usuarios: d.max_usuarios ?? 50,
        max_miembros: d.max_miembros ?? 10000,
        configuracion: (d.configuracion as Record<string, unknown>) ?? {},
        created_at: d.created_at ?? '',
        updated_at: d.updated_at ?? '',
      });
    } catch (err) {
      console.error('Error loading tenant:', err);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  async function handleSave(formData: {
    nombre: string;
    plan: string;
    color_primario: string;
  }) {
    if (!tenant) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('tenants')
        .update({
          nombre: formData.nombre,
          plan: formData.plan,
          color_primario: formData.color_primario,
        })
        .eq('id', tenant.id);

      if (error) {
        setApiError(error.message || 'Error al actualizar la organizacion');
        setSubmitting(false);
        return;
      }

      await fetchTenant();
      setEditing(false);
    } catch {
      setApiError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <Loader2
          className="h-8 w-8 animate-spin text-slate-400"
          aria-hidden="true"
        />
        <span className="sr-only">Cargando organizacion...</span>
      </div>
    );
  }

  // Not found
  if (!tenant) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <p className="text-sm text-slate-500">Organizacion no encontrada.</p>
        <Button
          variant="outline"
          className="mt-space-4"
          onClick={() => router.push('/platform/tenants')}
        >
          Volver a la Lista
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[getStatusKey(tenant.activo)];
  const planCfg = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.basico;

  return (
    <div>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-space-4 text-slate-500 hover:text-slate-700"
        onClick={() => router.push('/platform/tenants')}
      >
        <ArrowLeft size={16} className="mr-1" aria-hidden="true" />
        Volver a Organizaciones
      </Button>

      {/* Page Header */}
      <div className="mb-space-8 flex flex-col gap-space-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-space-3">
            {/* Color Swatch */}
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: tenant.color_primario }}
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {tenant.nombre}
            </h1>
          </div>
          <div className="mt-space-2 flex items-center gap-space-2">
            <span className="font-mono text-sm text-slate-500">
              {tenant.slug}
            </span>
            <Badge
              variant="secondary"
              className={cn('border-transparent', statusCfg.color)}
            >
              {statusCfg.label}
            </Badge>
            <Badge
              variant="secondary"
              className={cn('border-transparent', planCfg.color)}
            >
              {planCfg.label}
            </Badge>
          </div>
        </div>

        {!editing && (
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
          >
            <Pencil size={16} className="mr-1" aria-hidden="true" />
            Editar
          </Button>
        )}
      </div>

      {/* Usage Metrics */}
      <TenantUsageCard
        nombre={tenant.nombre}
        userCount={0}
        memberCount={0}
        storageUsedMB={0}
        className="mb-space-6"
      />

      {/* Edit Form or View */}
      {editing ? (
        <div className="rounded-lg border border-slate-200 bg-white p-space-6">
          <h2 className="mb-space-6 text-lg font-semibold text-slate-900">
            Editar Organizacion
          </h2>
          <TenantForm
            tenant={tenant}
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
            submitting={submitting}
            apiError={apiError}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-space-6">
          <h2 className="mb-space-6 text-lg font-semibold text-slate-900">
            Detalles
          </h2>
          <dl className="grid grid-cols-1 gap-space-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Nombre
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{tenant.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Slug
              </dt>
              <dd className="mt-1 font-mono text-sm text-slate-900">
                {tenant.slug}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Plan
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{planCfg.label}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Color Primario
              </dt>
              <dd className="mt-1 flex items-center gap-space-2">
                <div
                  className="h-4 w-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: tenant.color_primario }}
                  aria-hidden="true"
                />
                <span className="font-mono text-sm text-slate-900">
                  {tenant.color_primario}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Creado
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {new Date(tenant.created_at).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Actualizado
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {new Date(tenant.updated_at).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
