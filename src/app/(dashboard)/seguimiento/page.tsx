'use client';

import Link from 'next/link';
import {
  Phone,
  BarChart3,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HubCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

function HubCard({ title, description, href, icon: Icon, color }: HubCardProps) {
  return (
    <Link href={href}>
      <Card className="group cursor-pointer shadow-sm transition-all hover:border-primary hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              color
            )}
          >
            <Icon size={24} strokeWidth={1.5} className="text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-primary-text">
              {title}
            </p>
            <p className="mt-0.5 text-sm text-secondary-text">
              {description}
            </p>
          </div>
          <ChevronRight
            size={20}
            className="flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function SeguimientoHubPage() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Seguimiento No Inscritos
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Seguimiento de personas no inscritas en el padron electoral: llamadas, conversiones y reportes
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-space-6 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/seguimiento/cola">
            <Phone className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Iniciar Llamadas
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/seguimiento/reportes">
            <BarChart3 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Reporte Conversiones
          </Link>
        </Button>
      </div>

      {/* Hub Cards */}
      <div className="grid grid-cols-1 gap-space-4 sm:grid-cols-2">
        <HubCard
          title="Cola de Seguimiento"
          description="Lista de personas pendientes de contacto en sus recintos asignados"
          href="/seguimiento/cola"
          icon={Phone}
          color="bg-blue-50"
        />
        <HubCard
          title="Reporte de Conversiones"
          description="Tasas de conversion por area geografica y periodo de tiempo"
          href="/seguimiento/reportes"
          icon={BarChart3}
          color="bg-emerald-50"
        />
        <HubCard
          title="Plantillas de Llamada"
          description="Administrar guiones de llamada para el equipo de campo"
          href="/seguimiento/plantillas"
          icon={FileText}
          color="bg-amber-50"
        />
      </div>
    </div>
  );
}
