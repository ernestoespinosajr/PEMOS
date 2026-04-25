'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Check,
  AlertTriangle,
  Loader2,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  isValidHex,
  meetsContrastRequirement,
  getContrastRatio,
  applyBranding,
} from '@/lib/tenant/branding';
import { useTenantBranding } from '@/components/layout/tenant-branding-provider';
import { PRESET_COLORS } from '@/types/tenant';
import type { TenantBranding } from '@/types/tenant';

// ---------- Schema ----------

const orgSettingsSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  color_primario: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex invalido'),
});

type OrgSettingsData = z.infer<typeof orgSettingsSchema>;

// ---------- Color Picker ----------

function TenantColorPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}) {
  const [inputValue, setInputValue] = useState(value);
  const isValid = isValidHex(inputValue);
  const meetsContrast = isValid && meetsContrastRequirement(inputValue);
  const contrastRatio = isValid ? getContrastRatio(inputValue) : 0;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  function handleInputChange(hex: string) {
    setInputValue(hex);
    if (isValidHex(hex)) {
      onChange(hex);
    }
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="org-color-input">Color de la marca</Label>

      {/* Preset Colors */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colores predefinidos">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            onClick={() => handleInputChange(preset.hex)}
            className={cn(
              'relative h-8 w-8 rounded-full border-2 transition-all duration-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              value === preset.hex
                ? 'border-primary-text ring-2 ring-primary/30'
                : 'border-transparent hover:border-border'
            )}
            style={{ backgroundColor: preset.hex }}
            title={preset.label}
            aria-label={`${preset.label} (${preset.hex})`}
            aria-checked={value === preset.hex}
            role="radio"
          >
            {value === preset.hex && (
              <Check
                size={14}
                strokeWidth={2.5}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {/* Hex Input */}
      <div className="flex items-center gap-space-2">
        <div
          className="h-10 w-10 flex-shrink-0 rounded-md border border-border"
          style={{ backgroundColor: isValid ? inputValue : '#CCCCCC' }}
          aria-hidden="true"
        />
        <Input
          id="org-color-input"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="#2D6A4F"
          maxLength={7}
          className="font-mono"
          aria-invalid={!!error || !isValid}
          aria-describedby="org-color-feedback"
        />
      </div>

      {/* Contrast Feedback */}
      <div id="org-color-feedback">
        {isValid && (
          <>
            {meetsContrast ? (
              <div className="flex items-center gap-1 text-xs text-success">
                <Check size={12} aria-hidden="true" />
                <span>Contraste: {contrastRatio}:1 (WCAG AA cumplido)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-warning">
                <AlertTriangle size={12} aria-hidden="true" />
                <span>Contraste: {contrastRatio}:1 (minimo 4.5:1 recomendado)</span>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------- Branding Preview ----------

function BrandingPreview({ color, nombre }: { color: string; nombre: string }) {
  const isValid = isValidHex(color);
  const displayColor = isValid ? color : '#2D6A4F';

  return (
    <div className="rounded-lg border border-border bg-neutral-50 p-space-4">
      <p className="mb-space-3 text-xs font-medium uppercase tracking-wide text-secondary-text">
        Vista previa
      </p>
      <div className="space-y-3">
        <div className="flex items-center gap-space-2 rounded-md bg-surface p-space-2 shadow-sm">
          <div
            className="h-6 w-6 rounded"
            style={{ backgroundColor: displayColor }}
            aria-hidden="true"
          />
          <span className="text-sm font-bold text-primary-text">
            {nombre || 'Tu Organizacion'}
          </span>
        </div>
        <div className="rounded-md p-space-2" style={{ backgroundColor: `${displayColor}15` }}>
          <span className="text-sm font-medium" style={{ color: displayColor }}>
            Dashboard
          </span>
        </div>
        <button
          type="button"
          className="rounded-md px-space-3 py-space-2 text-sm font-medium text-white"
          style={{ backgroundColor: displayColor }}
          tabIndex={-1}
          aria-label="Ejemplo de boton"
        >
          Boton Primario
        </button>
      </div>
    </div>
  );
}

// ---------- Main Page ----------

/**
 * Organizacion Settings Page
 *
 * Allows tenant admins to view and edit their organization's
 * branding (name, abbreviation, primary color). Changes are saved
 * to the `tenants` table and applied via CSS custom properties.
 */
export default function OrganizacionPage() {
  const { branding, refreshBranding } = useTenantBranding();
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<OrgSettingsData>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      nombre: '',
      color_primario: '#2D6A4F',
    },
  });

  const watchedColor = watch('color_primario');
  const watchedNombre = watch('nombre');

  // Load tenant data
  const loadTenantData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const tid =
        (user.app_metadata?.tenant_id as string) ??
        (user.user_metadata?.tenant_id as string) ??
        null;

      if (!tid) {
        setLoading(false);
        return;
      }

      setTenantId(tid);

      // Note: 'tenants' table will be added by ftr-011 migration.
      // Using type assertion until Supabase types are regenerated.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenant } = await (supabase as any)
        .from('tenants')
        .select('nombre, color_primario')
        .eq('id', tid)
        .single();

      if (tenant) {
        const t = tenant as { nombre: string; color_primario: string };
        reset({
          nombre: t.nombre || '',
          color_primario: t.color_primario || '#2D6A4F',
        });
      }
    } catch (err) {
      console.error('Error loading tenant data:', err);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData]);

  async function onSubmit(data: OrgSettingsData) {
    if (!tenantId) return;

    setSubmitting(true);
    setApiError(null);
    setSuccessMsg(null);

    try {
      const supabase = createClient();
      // Type assertion until tenants table is in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('tenants')
        .update({
          nombre: data.nombre,
          color_primario: data.color_primario,
        })
        .eq('id', tenantId);

      if (error) {
        setApiError(error.message || 'Error al guardar los cambios');
        setSubmitting(false);
        return;
      }

      // Apply branding immediately
      const newBranding: TenantBranding = {
        nombre: data.nombre,
        logo_url: branding.logo_url,
        color_primario: data.color_primario,
        color_secundario: branding.color_secundario,
      };
      applyBranding(newBranding);

      // Refresh the branding context
      await refreshBranding();

      setSuccessMsg('Cambios guardados correctamente.');
      reset(data);
    } catch {
      setApiError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Cargando configuracion...</span>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <Building2
          size={40}
          strokeWidth={1}
          className="mb-space-3 text-placeholder"
          aria-hidden="true"
        />
        <p className="text-sm text-secondary-text">
          No se encontro una organizacion asociada a tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-8">
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Organizacion
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Configura el nombre y color de marca de tu organizacion.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-space-6 lg:grid-cols-3">
        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-space-6 lg:col-span-2"
        >
          <div className="rounded-lg border border-border bg-surface p-space-6">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="org-nombre">
                Nombre de la organizacion{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="org-nombre"
                placeholder="Mi Organizacion"
                aria-invalid={!!errors.nombre}
                aria-describedby={errors.nombre ? 'org-nombre-error' : undefined}
                {...register('nombre')}
              />
              {errors.nombre && (
                <p
                  id="org-nombre-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {errors.nombre.message}
                </p>
              )}
            </div>

            {/* Color Picker */}
            <div className="mt-space-6">
              <TenantColorPicker
                value={watchedColor}
                onChange={(hex) =>
                  setValue('color_primario', hex, { shouldValidate: true, shouldDirty: true })
                }
                error={errors.color_primario?.message}
              />
            </div>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div
              className="rounded-md border border-success/20 bg-success-light p-3"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <Check size={16} className="text-success" aria-hidden="true" />
                <p className="text-sm text-success">{successMsg}</p>
              </div>
            </div>
          )}

          {/* API Error */}
          {apiError && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-destructive">{apiError}</p>
            </div>
          )}

          {/* Save Button */}
          <Button type="submit" disabled={submitting || !isDirty}>
            {submitting ? (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save size={16} className="mr-1" aria-hidden="true" />
            )}
            Guardar Cambios
          </Button>
        </form>

        {/* Preview */}
        <div className="lg:col-span-1">
          <BrandingPreview color={watchedColor} nombre={watchedNombre} />
        </div>
      </div>
    </div>
  );
}
