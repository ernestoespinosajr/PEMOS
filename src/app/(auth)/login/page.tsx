'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createBrowserClient } from '@supabase/ssr';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
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

/* ---------- Schemas ---------- */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const magicLinkSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

/* ---------- Inner component (uses useSearchParams) ---------- */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<'password' | 'magic-link'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  /* --- Password form --- */
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /* --- Magic link form --- */
  const {
    register: registerMagic,
    handleSubmit: handleMagicSubmit,
    formState: { errors: magicErrors, isSubmitting: isMagicSubmitting },
  } = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });

  /* --- Handlers --- */
  async function onLoginSubmit(data: LoginFormData) {
    setAuthError(null);

    const { error } = await getSupabase().auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setAuthError('Credenciales inválidas');
      return;
    }

    const redirectTo = searchParams.get('redirectTo') || '/';
    router.push(redirectTo);
    router.refresh();
  }

  async function onMagicLinkSubmit(data: MagicLinkFormData) {
    setAuthError(null);

    const { error } = await getSupabase().auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setAuthError('No se pudo enviar el enlace. Intenta de nuevo.');
      return;
    }

    setMagicLinkSent(true);
  }

  function switchView(next: 'password' | 'magic-link') {
    setView(next);
    setAuthError(null);
    setMagicLinkSent(false);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          Iniciar Sesión
        </h2>
        <p className="text-sm text-muted-foreground">
          Ingresa tus credenciales para acceder al sistema
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

        {/* ===== PASSWORD VIEW ===== */}
        {view === 'password' && (
          <form
            onSubmit={handleLoginSubmit(onLoginSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  className={cn(
                    'pl-9',
                    loginErrors.email && 'border-destructive focus-visible:ring-destructive',
                  )}
                  aria-invalid={loginErrors.email ? 'true' : undefined}
                  aria-describedby={loginErrors.email ? 'login-email-error' : undefined}
                  {...registerLogin('email')}
                />
              </div>
              {loginErrors.email && (
                <p
                  id="login-email-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {loginErrors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="login-password">Contraseña</Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  autoComplete="current-password"
                  className={cn(
                    'pl-9 pr-10',
                    loginErrors.password && 'border-destructive focus-visible:ring-destructive',
                  )}
                  aria-invalid={loginErrors.password ? 'true' : undefined}
                  aria-describedby={loginErrors.password ? 'login-password-error' : undefined}
                  {...registerLogin('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {loginErrors.password && (
                <p
                  id="login-password-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {loginErrors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoginSubmitting}
            >
              {isLoginSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Ingresando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            {/* Forgot password */}
            <div className="text-center">
              <Link
                href="/reset-password"
                className="text-sm text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o</span>
              </div>
            </div>

            {/* Switch to magic link */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => switchView('magic-link')}
            >
              Iniciar con enlace mágico
            </Button>
          </form>
        )}

        {/* ===== MAGIC LINK VIEW ===== */}
        {view === 'magic-link' && (
          <>
            {magicLinkSent ? (
              /* Success message */
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
                    Revisa tu correo electrónico para el enlace de acceso
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => switchView('password')}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Volver al inicio de sesión
                </Button>
              </div>
            ) : (
              /* Magic link form */
              <form
                onSubmit={handleMagicSubmit(onMagicLinkSubmit)}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Correo electrónico</Label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      autoComplete="email"
                      className={cn(
                        'pl-9',
                        magicErrors.email && 'border-destructive focus-visible:ring-destructive',
                      )}
                      aria-invalid={magicErrors.email ? 'true' : undefined}
                      aria-describedby={magicErrors.email ? 'magic-email-error' : undefined}
                      {...registerMagic('email')}
                    />
                  </div>
                  {magicErrors.email && (
                    <p
                      id="magic-email-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {magicErrors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isMagicSubmitting}
                >
                  {isMagicSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace mágico'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => switchView('password')}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Volver al inicio de sesión
                </Button>
              </form>
            )}
          </>
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

/* ---------- Page export (Suspense boundary for useSearchParams) ---------- */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
