'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createBrowserClient } from '@supabase/ssr';
import {
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ---------- Supabase client (lazy, avoids SSR prerender crash) ---------- */
function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/* ---------- Schema ---------- */
const resetSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
});

type ResetFormData = z.infer<typeof resetSchema>;

/* ---------- Component ---------- */
export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(data: ResetFormData) {
    setAuthError(null);

    const { error } = await getSupabase().auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
    });

    if (error) {
      setAuthError('No se pudo enviar el enlace. Intenta de nuevo.');
      return;
    }

    setSent(true);
  }

  /* ---------- Render ---------- */
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          Restablecer contraseña
        </h2>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo electrónico y te enviaremos un enlace para
          restablecer tu contraseña
        </p>
      </CardHeader>

      <CardContent>
        {/* Auth error banner */}
        {authError && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {authError}
          </div>
        )}

        {sent ? (
          /* Success state */
          <div className="space-y-4">
            <div
              role="status"
              className="flex flex-col items-center gap-3 rounded-md border border-primary/30 bg-accent px-4 py-6 text-center"
            >
              <CheckCircle2
                className="h-8 w-8 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-foreground">
                Si existe una cuenta con ese correo, recibirás un enlace para
                restablecer tu contraseña
              </p>
            </div>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al inicio de sesión
              </Link>
            </Button>
          </div>
        ) : (
          /* Form */
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="reset-email">Correo electrónico</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  className={cn(
                    'pl-9',
                    errors.email && 'border-destructive focus-visible:ring-destructive',
                  )}
                  aria-invalid={errors.email ? 'true' : undefined}
                  aria-describedby={errors.email ? 'reset-email-error' : undefined}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p
                  id="reset-email-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Enviando...
                </>
              ) : (
                'Enviar enlace'
              )}
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al inicio de sesión
              </Link>
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">
          PEMOS &mdash; Sistema de Monitoreo Electoral
        </p>
      </CardFooter>
    </Card>
  );
}
