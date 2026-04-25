'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserPlus,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLAN_CONFIG, type TenantPlan, type ProvisionTenantPayload } from '@/types/tenant';

// ---------- Step Schemas ----------

const step1Schema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  slug: z
    .string()
    .min(1, 'El slug es requerido')
    .max(100, 'Maximo 100 caracteres')
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Solo letras minusculas, numeros y guiones (sin guiones al inicio o final)'
    ),
  plan: z.enum(['basico', 'profesional', 'empresarial'], {
    message: 'Selecciona un plan',
  }),
});

const step2Schema = z.object({
  admin_email: z.string().email('Correo electronico invalido'),
  admin_nombre: z.string().min(1, 'El nombre es requerido'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

// ---------- Slug Generator ----------

/**
 * Generates a URL-safe slug from the organization name.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
}

// ---------- Step Indicator ----------

interface StepIndicatorProps {
  currentStep: number;
  steps: { label: string; icon: React.ElementType }[];
}

function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <nav aria-label="Progreso del asistente" className="mb-space-8">
      <ol className="flex items-center justify-center gap-space-2 sm:gap-space-4">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;
          const Icon = step.icon;

          return (
            <li key={step.label} className="flex items-center">
              {index > 0 && (
                <div
                  className={cn(
                    'mx-2 hidden h-px w-8 sm:block',
                    isCompleted ? 'bg-slate-700' : 'bg-slate-200'
                  )}
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center gap-space-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isCompleted
                      ? 'bg-slate-700 text-white'
                      : isCurrent
                        ? 'border-2 border-slate-700 bg-white text-slate-700'
                        : 'border border-slate-200 bg-white text-slate-400'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
                  )}
                </div>
                <span
                  className={cn(
                    'hidden text-sm sm:block',
                    isCurrent ? 'font-medium text-slate-900' : 'text-slate-500'
                  )}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------- Step 1: Organization Info ----------

function Step1({
  onNext,
  defaultValues,
}: {
  onNext: (data: Step1Data) => void;
  defaultValues: Partial<Step1Data>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      nombre: defaultValues.nombre ?? '',
      slug: defaultValues.slug ?? '',
      plan: defaultValues.plan ?? 'profesional',
    },
  });

  const watchedNombre = watch('nombre');
  const watchedSlug = watch('slug');

  function handleNombreBlur() {
    // Auto-generate slug from name if slug is empty
    if (!watchedSlug && watchedNombre) {
      setValue('slug', generateSlug(watchedNombre), { shouldValidate: true });
    }
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-space-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Informacion de la Organizacion
        </h2>
        <p className="mt-space-1 text-sm text-slate-500">
          Ingresa los datos basicos del nuevo partido u organizacion.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prov-nombre">
          Nombre completo <span className="text-destructive">*</span>
        </Label>
        <Input
          id="prov-nombre"
          placeholder="Partido Ejemplo Nacional"
          aria-invalid={!!errors.nombre}
          aria-describedby={errors.nombre ? 'prov-nombre-error' : undefined}
          {...register('nombre', {
            onBlur: handleNombreBlur,
          })}
        />
        {errors.nombre && (
          <p id="prov-nombre-error" className="text-xs text-destructive" role="alert">
            {errors.nombre.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prov-slug">
          Slug (URL) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="prov-slug"
          placeholder="partido-ejemplo-nacional"
          maxLength={100}
          aria-invalid={!!errors.slug}
          aria-describedby={errors.slug ? 'prov-slug-error' : 'prov-slug-help'}
          {...register('slug')}
        />
        <p id="prov-slug-help" className="text-xs text-slate-500">
          Identificador unico en la URL. Solo minusculas, numeros y guiones.
        </p>
        {errors.slug && (
          <p id="prov-slug-error" className="text-xs text-destructive" role="alert">
            {errors.slug.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prov-plan">
          Plan <span className="text-destructive">*</span>
        </Label>
        <SelectNative
          id="prov-plan"
          aria-invalid={!!errors.plan}
          aria-describedby={errors.plan ? 'prov-plan-error' : undefined}
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
          <p id="prov-plan-error" className="text-xs text-destructive" role="alert">
            {errors.plan.message}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-space-4">
        <Button type="submit">
          Siguiente
          <ChevronRight size={16} className="ml-1" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}

// ---------- Step 2: Admin User ----------

function Step2({
  onNext,
  onBack,
  defaultValues,
}: {
  onNext: (data: Step2Data) => void;
  onBack: () => void;
  defaultValues: Partial<Step2Data>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      admin_email: defaultValues.admin_email ?? '',
      admin_nombre: defaultValues.admin_nombre ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-space-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Administrador Inicial
        </h2>
        <p className="mt-space-1 text-sm text-slate-500">
          Este usuario sera el primer administrador de la organizacion. Recibira
          un correo de invitacion para acceder al sistema.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prov-admin-nombre">
          Nombre completo <span className="text-destructive">*</span>
        </Label>
        <Input
          id="prov-admin-nombre"
          placeholder="Juan Perez"
          aria-invalid={!!errors.admin_nombre}
          aria-describedby={errors.admin_nombre ? 'prov-admin-nombre-error' : undefined}
          {...register('admin_nombre')}
        />
        {errors.admin_nombre && (
          <p id="prov-admin-nombre-error" className="text-xs text-destructive" role="alert">
            {errors.admin_nombre.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prov-admin-email">
          Correo electronico <span className="text-destructive">*</span>
        </Label>
        <Input
          id="prov-admin-email"
          type="email"
          placeholder="admin@partido.com"
          aria-invalid={!!errors.admin_email}
          aria-describedby={errors.admin_email ? 'prov-admin-email-error' : 'prov-admin-email-help'}
          {...register('admin_email')}
        />
        <p id="prov-admin-email-help" className="text-xs text-slate-500">
          Se enviara un correo de invitacion a esta direccion.
        </p>
        {errors.admin_email && (
          <p id="prov-admin-email-error" className="text-xs text-destructive" role="alert">
            {errors.admin_email.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-space-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft size={16} className="mr-1" aria-hidden="true" />
          Anterior
        </Button>
        <Button type="submit">
          Siguiente
          <ChevronRight size={16} className="ml-1" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}

// ---------- Step 3: Review & Confirm ----------

function Step3({
  data,
  onBack,
  onConfirm,
  submitting,
  apiError,
}: {
  data: ProvisionTenantPayload;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
  apiError: string | null;
}) {
  const planLabel = PLAN_CONFIG[data.plan]?.label ?? data.plan;

  return (
    <div className="space-y-space-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Confirmar y Crear
        </h2>
        <p className="mt-space-1 text-sm text-slate-500">
          Revisa los datos antes de crear la organizacion. Esta accion creara el
          tenant, el usuario administrador, y enviara la invitacion por correo.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200">
        {/* Organization */}
        <div className="p-space-4">
          <p className="mb-space-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Organizacion
          </p>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-600">Nombre</dt>
              <dd className="text-sm font-medium text-slate-900">{data.nombre}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-600">Slug</dt>
              <dd className="font-mono text-sm font-medium text-slate-900">{data.slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-600">Plan</dt>
              <dd className="text-sm font-medium text-slate-900">{planLabel}</dd>
            </div>
          </dl>
        </div>

        {/* Admin User */}
        <div className="p-space-4">
          <p className="mb-space-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Administrador
          </p>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-600">Nombre</dt>
              <dd className="text-sm font-medium text-slate-900">
                {data.admin_nombre}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-600">Correo</dt>
              <dd className="text-sm font-medium text-slate-900">{data.admin_email}</dd>
            </div>
          </dl>
        </div>
      </div>

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

      <div className="flex items-center justify-between pt-space-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          <ChevronLeft size={16} className="mr-1" aria-hidden="true" />
          Anterior
        </Button>
        <Button onClick={onConfirm} disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check size={16} className="mr-1" aria-hidden="true" />
          )}
          Crear Organizacion
        </Button>
      </div>
    </div>
  );
}

// ---------- Main Wizard Component ----------

interface ProvisioningWizardProps {
  onComplete: (payload: ProvisionTenantPayload) => Promise<void>;
  onCancel: () => void;
}

/**
 * ProvisioningWizard
 *
 * Multi-step form for provisioning a new tenant.
 * Step 1: Organization name, slug, plan
 * Step 2: Initial admin user email, name
 * Step 3: Review and confirm
 */
export function ProvisioningWizard({ onComplete, onCancel }: ProvisioningWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const steps = [
    { label: 'Organizacion', icon: Building2 },
    { label: 'Administrador', icon: UserPlus },
    { label: 'Confirmar', icon: ClipboardList },
  ];

  function handleStep1(data: Step1Data) {
    setStep1Data(data);
    setCurrentStep(2);
  }

  function handleStep2(data: Step2Data) {
    setStep2Data(data);
    setCurrentStep(3);
  }

  async function handleConfirm() {
    if (!step1Data || !step2Data) return;

    setSubmitting(true);
    setApiError(null);

    const payload: ProvisionTenantPayload = {
      nombre: step1Data.nombre,
      slug: step1Data.slug,
      plan: step1Data.plan as ProvisionTenantPayload['plan'],
      admin_email: step2Data.admin_email,
      admin_nombre: step2Data.admin_nombre,
    };

    try {
      await onComplete(payload);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Error al crear la organizacion. Intenta nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const fullPayload: ProvisionTenantPayload | null =
    step1Data && step2Data
      ? {
          nombre: step1Data.nombre,
          slug: step1Data.slug,
          plan: step1Data.plan as ProvisionTenantPayload['plan'],
          admin_email: step2Data.admin_email,
          admin_nombre: step2Data.admin_nombre,
        }
      : null;

  return (
    <div className="mx-auto max-w-lg">
      <StepIndicator currentStep={currentStep} steps={steps} />

      {currentStep === 1 && (
        <Step1
          onNext={handleStep1}
          defaultValues={step1Data ?? {}}
        />
      )}

      {currentStep === 2 && (
        <Step2
          onNext={handleStep2}
          onBack={() => setCurrentStep(1)}
          defaultValues={step2Data ?? {}}
        />
      )}

      {currentStep === 3 && fullPayload && (
        <Step3
          data={fullPayload}
          onBack={() => setCurrentStep(2)}
          onConfirm={handleConfirm}
          submitting={submitting}
          apiError={apiError}
        />
      )}

      {/* Cancel always available */}
      {!submitting && (
        <div className="mt-space-6 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
