'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isValidHex,
  meetsContrastRequirement,
  getContrastRatio,
} from '@/lib/tenant/branding';
import {
  PRESET_COLORS,
  PLAN_CONFIG,
  type Tenant,
  type TenantPlan,
} from '@/types/tenant';

// ---------- Schema ----------

const tenantFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  plan: z.enum(['basico', 'profesional', 'empresarial'], {
    message: 'Selecciona un plan',
  }),
  color_primario: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex invalido (ej: #2D6A4F)'),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

// ---------- Props ----------

interface TenantFormProps {
  /** Existing tenant for edit mode. Null for create mode. */
  tenant?: Tenant | null;
  /** Called on successful form submission */
  onSubmit: (data: TenantFormData) => Promise<void>;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the form is in a submitting state */
  submitting?: boolean;
  /** External API error */
  apiError?: string | null;
}

// ---------- Color Picker Sub-Component ----------

function ColorPicker({
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
      <Label htmlFor="color-input">
        Color primario <span className="text-destructive">*</span>
      </Label>

      {/* Preset Colors */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colores predefinidos">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            onClick={() => {
              handleInputChange(preset.hex);
            }}
            className={cn(
              'relative h-8 w-8 rounded-full border-2 transition-all duration-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500',
              value === preset.hex
                ? 'border-slate-900 ring-2 ring-slate-300'
                : 'border-transparent hover:border-slate-300'
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
          className="h-10 w-10 flex-shrink-0 rounded-md border border-slate-200"
          style={{ backgroundColor: isValid ? inputValue : '#CCCCCC' }}
          aria-hidden="true"
        />
        <Input
          id="color-input"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="#2D6A4F"
          maxLength={7}
          className="font-mono"
          aria-invalid={!!error || !isValid}
          aria-describedby="color-feedback"
        />
      </div>

      {/* Contrast Feedback */}
      <div id="color-feedback" className="flex items-center gap-space-2">
        {isValid && (
          <>
            {meetsContrast ? (
              <div className="flex items-center gap-1 text-xs text-green-700">
                <Check size={12} aria-hidden="true" />
                <span>
                  Contraste con blanco: {contrastRatio}:1 (WCAG AA cumplido)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-yellow-700">
                <AlertTriangle size={12} aria-hidden="true" />
                <span>
                  Contraste con blanco: {contrastRatio}:1 (minimo 4.5:1 recomendado)
                </span>
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

// ---------- Branding Preview Sub-Component ----------

function BrandingPreview({ color, nombre }: { color: string; nombre: string }) {
  const isValid = isValidHex(color);
  const displayColor = isValid ? color : '#2D6A4F';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-space-4">
      <p className="mb-space-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        Vista previa
      </p>

      <div className="space-y-3">
        {/* Mini sidebar preview */}
        <div className="flex items-center gap-space-2 rounded-md bg-white p-space-2 shadow-sm">
          <div
            className="h-6 w-6 rounded"
            style={{ backgroundColor: displayColor }}
            aria-hidden="true"
          />
          <span className="text-sm font-bold text-slate-900">
            {nombre || 'Organizacion'}
          </span>
        </div>

        {/* Active nav item preview */}
        <div className="rounded-md p-space-2" style={{ backgroundColor: `${displayColor}15` }}>
          <div className="flex items-center gap-space-2">
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: displayColor }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium" style={{ color: displayColor }}>
              Dashboard
            </span>
          </div>
        </div>

        {/* Button preview */}
        <button
          type="button"
          className="rounded-md px-space-3 py-space-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: displayColor }}
          aria-label="Ejemplo de boton primario"
          tabIndex={-1}
        >
          Boton Primario
        </button>
      </div>
    </div>
  );
}

// ---------- Main Component ----------

/**
 * TenantForm
 *
 * Create/edit form for tenant settings including name, plan selection,
 * and brand color configuration with live preview.
 */
export function TenantForm({
  tenant,
  onSubmit,
  onCancel,
  submitting = false,
  apiError,
}: TenantFormProps) {
  const isEdit = !!tenant;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      nombre: tenant?.nombre ?? '',
      plan: tenant?.plan ?? 'basico',
      color_primario: tenant?.color_primario ?? '#2D6A4F',
    },
  });

  const watchedColor = watch('color_primario');
  const watchedNombre = watch('nombre');

  async function handleFormSubmit(data: TenantFormData) {
    await onSubmit(data);
  }

  return (
    <div className="grid grid-cols-1 gap-space-6 lg:grid-cols-3">
      {/* Form */}
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-space-6 lg:col-span-2"
      >
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="tenant-nombre">
            Nombre de la organizacion <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tenant-nombre"
            placeholder="Partido Ejemplo Nacional"
            aria-invalid={!!errors.nombre}
            aria-describedby={errors.nombre ? 'tenant-nombre-error' : undefined}
            {...register('nombre')}
          />
          {errors.nombre && (
            <p id="tenant-nombre-error" className="text-xs text-destructive" role="alert">
              {errors.nombre.message}
            </p>
          )}
        </div>

        {/* Plan */}
        <div className="space-y-1.5">
          <Label htmlFor="tenant-plan">
            Plan <span className="text-destructive">*</span>
          </Label>
          <SelectNative
            id="tenant-plan"
            aria-invalid={!!errors.plan}
            aria-describedby={errors.plan ? 'tenant-plan-error' : undefined}
            {...register('plan')}
          >
            {(Object.entries(PLAN_CONFIG) as [TenantPlan, { label: string }][]).map(
              ([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              )
            )}
          </SelectNative>
          {errors.plan && (
            <p id="tenant-plan-error" className="text-xs text-destructive" role="alert">
              {errors.plan.message}
            </p>
          )}
        </div>

        {/* Color Picker */}
        <ColorPicker
          value={watchedColor}
          onChange={(hex) => setValue('color_primario', hex, { shouldValidate: true })}
          error={errors.color_primario?.message}
        />

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

        {/* Actions */}
        <div className="flex items-center gap-space-3 pt-space-4">
          <Button type="submit" disabled={submitting}>
            {submitting && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {isEdit ? 'Guardar Cambios' : 'Crear Organizacion'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>
        </div>
      </form>

      {/* Preview Panel */}
      <div className="lg:col-span-1">
        <BrandingPreview color={watchedColor} nombre={watchedNombre} />
      </div>
    </div>
  );
}
