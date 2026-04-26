import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Cuenta Suspendida - PEMOS',
};

/**
 * Suspended tenant page.
 * Shown when a user's tenant has been deactivated (tenants.activo = false).
 * The JWT custom_access_token_hook sets tenant_suspended: true, and the
 * middleware redirects here.
 */
export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-space-4">
      <div className="mx-auto max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-space-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
          <ShieldOff
            size={32}
            strokeWidth={1.5}
            className="text-warning"
            aria-hidden="true"
          />
        </div>

        {/* Heading */}
        <h1 className="mb-space-2 text-2xl font-bold text-foreground">
          Cuenta Suspendida
        </h1>

        {/* Message */}
        <p className="mb-space-2 text-base text-muted-foreground">
          Tu organizacion no tiene acceso activo.
        </p>

        {/* Subtitle */}
        <p className="mb-space-8 text-sm text-muted-foreground">
          Contacta al administrador de la plataforma para reactivar el acceso.
        </p>

        {/* Action */}
        <Button asChild variant="outline">
          <Link href="/login">Volver al inicio de sesion</Link>
        </Button>
      </div>
    </div>
  );
}
