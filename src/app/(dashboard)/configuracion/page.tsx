import Link from 'next/link';
import { Building2, Settings, Users } from 'lucide-react';

const configSections = [
  {
    title: 'Gestion de Usuarios',
    description:
      'Administra usuarios, roles y ambitos geograficos del sistema.',
    href: '/configuracion/usuarios',
    icon: Users,
    adminOnly: true,
  },
  {
    title: 'Organizacion',
    description:
      'Configura el nombre y color de marca de tu organizacion.',
    href: '/configuracion/organizacion',
    icon: Building2,
    adminOnly: true,
  },
  {
    title: 'Sistema',
    description: 'Configuraciones generales del sistema.',
    href: '/configuracion/sistema',
    icon: Settings,
    adminOnly: true,
  },
];

export default function ConfiguracionPage() {
  return (
    <div>
      <div className="mb-space-8">
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">
          Configuracion
        </h2>
        <p className="mt-space-1 text-sm text-secondary-text">
          Ajustes del sistema y administracion
        </p>
      </div>

      <div className="grid grid-cols-1 gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
        {configSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-lg border border-border bg-surface p-space-6 shadow-sm transition-shadow duration-150 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="flex items-center gap-space-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-tint">
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    className="text-primary"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base font-semibold text-primary-text group-hover:text-primary">
                  {section.title}
                </h3>
              </div>
              <p className="mt-space-3 text-sm text-secondary-text">
                {section.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
