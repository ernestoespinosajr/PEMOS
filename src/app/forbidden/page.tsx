import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Acceso Denegado - PEMOS',
};

/**
 * 403 Forbidden page.
 * Shown when a user attempts to access a route their role does not permit.
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-space-4">
      <div className="mx-auto max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-space-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <Lock
            size={32}
            strokeWidth={1.5}
            className="text-destructive"
            aria-hidden="true"
          />
        </div>

        {/* Heading */}
        <h1 className="mb-space-2 text-2xl font-bold text-foreground">
          Acceso Denegado
        </h1>

        {/* Message */}
        <p className="mb-space-2 text-base text-muted-foreground">
          No tienes permiso para acceder a esta seccion.
        </p>

        {/* Subtitle */}
        <p className="mb-space-8 text-sm text-muted-foreground">
          Contacta a tu administrador si crees que esto es un error.
        </p>

        {/* Action */}
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
