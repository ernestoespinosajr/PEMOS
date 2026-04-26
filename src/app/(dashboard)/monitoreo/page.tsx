'use client';

import Link from 'next/link';
import {
  Vote,
  FileText,
  UserCheck,
  Users,
  ChevronRight,
  Plus,
  BarChart3,
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

export default function MonitoreoElectoralPage() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Monitoreo Electoral
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Centro de operaciones electorales: votos, actas, asignaciones y participacion
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-space-6 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/monitoreo/votos">
            <Vote className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Registrar Votos
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/monitoreo/actas/nuevo">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Crear Acta
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/monitoreo/dashboard">
            <BarChart3 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Dashboard en Vivo
          </Link>
        </Button>
      </div>

      {/* Dashboard Card -- full width highlight */}
      <div className="mb-space-4">
        <HubCard
          title="Dashboard en Vivo"
          description="Resultados en tiempo real: votos por partido, linea de tiempo y participacion"
          href="/monitoreo/dashboard"
          icon={BarChart3}
          color="bg-rose-50"
        />
      </div>

      {/* Hub Cards */}
      <div className="grid grid-cols-1 gap-space-4 sm:grid-cols-2">
        <HubCard
          title="Registro de Votos"
          description="Registra los votos por candidato en cada colegio electoral"
          href="/monitoreo/votos"
          icon={Vote}
          color="bg-blue-50"
        />
        <HubCard
          title="Actas Electorales"
          description="Historial de actas registradas con datos oficiales de votacion"
          href="/monitoreo/actas"
          icon={FileText}
          color="bg-emerald-50"
        />
        <HubCard
          title="Asignacion de Observadores"
          description="Asigna observadores a recintos y colegios electorales"
          href="/monitoreo/asignaciones"
          icon={Users}
          color="bg-indigo-50"
        />
        <HubCard
          title="Participacion Electoral"
          description="Seguimiento de miembros que han ejercido su voto por recinto"
          href="/monitoreo/turnout"
          icon={UserCheck}
          color="bg-amber-50"
        />
      </div>
    </div>
  );
}
