'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Pause,
  Play,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PLAN_CONFIG,
  STATUS_CONFIG,
  getStatusKey,
  type TenantWithMetrics,
} from '@/types/tenant';

// ---------- Component ----------

interface TenantTableProps {
  tenants: TenantWithMetrics[];
  loading: boolean;
  onView: (tenant: TenantWithMetrics) => void;
  onEdit: (tenant: TenantWithMetrics) => void;
  onToggleStatus: (tenant: TenantWithMetrics) => void;
}

export function TenantTable({
  tenants,
  loading,
  onView,
  onEdit,
  onToggleStatus,
}: TenantTableProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <Loader2
          className="h-8 w-8 animate-spin text-slate-400"
          aria-hidden="true"
        />
        <span className="sr-only">Cargando tenants...</span>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300">
        <Building2
          size={40}
          strokeWidth={1}
          className="mb-space-3 text-slate-300"
          aria-hidden="true"
        />
        <p className="text-sm text-slate-500">
          No hay organizaciones registradas.
        </p>
        <p className="mt-space-1 text-xs text-slate-400">
          Crea la primera organizacion para comenzar.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden rounded-lg border border-slate-200 md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Organizacion</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Usuarios</TableHead>
              <TableHead className="text-right">Miembros</TableHead>
              <TableHead className="hidden lg:table-cell">Creado</TableHead>
              <TableHead className="w-[60px]">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => {
              const planCfg = PLAN_CONFIG[tenant.plan];
              const statusKey = getStatusKey(tenant.activo);
              const statusCfg = STATUS_CONFIG[statusKey];

              return (
                <TableRow key={tenant.id} className="hover:bg-slate-50">
                  {/* Name + Color Swatch */}
                  <TableCell>
                    <div className="flex items-center gap-space-2">
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: tenant.color_primario }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-slate-900">
                        {tenant.nombre}
                      </span>
                    </div>
                  </TableCell>

                  {/* Slug */}
                  <TableCell className="font-mono text-sm text-slate-500">
                    {tenant.slug}
                  </TableCell>

                  {/* Plan Badge */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('border-transparent', planCfg.color)}
                    >
                      {planCfg.label}
                    </Badge>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('border-transparent', statusCfg.color)}
                    >
                      {statusCfg.label}
                    </Badge>
                  </TableCell>

                  {/* User Count */}
                  <TableCell className="text-right font-mono text-sm text-slate-600">
                    {tenant.user_count.toLocaleString('es-DO')}
                  </TableCell>

                  {/* Member Count */}
                  <TableCell className="text-right font-mono text-sm text-slate-600">
                    {tenant.member_count.toLocaleString('es-DO')}
                  </TableCell>

                  {/* Created Date */}
                  <TableCell className="hidden text-sm text-slate-500 lg:table-cell">
                    {new Date(tenant.created_at).toLocaleDateString('es-DO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-500 hover:text-slate-700"
                          aria-label={`Acciones para ${tenant.nombre}`}
                        >
                          <MoreHorizontal
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(tenant)}>
                          <Eye
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(tenant)}>
                          <Pencil
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onToggleStatus(tenant)}
                          className={cn(
                            tenant.activo
                              ? 'text-destructive focus:text-destructive'
                              : 'text-green-700 focus:text-green-700'
                          )}
                        >
                          {tenant.activo ? (
                            <>
                              <Pause
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              Suspender
                            </>
                          ) : (
                            <>
                              <Play
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="space-y-3 md:hidden">
        {tenants.map((tenant) => {
          const planCfg = PLAN_CONFIG[tenant.plan];
          const statusKey = getStatusKey(tenant.activo);
          const statusCfg = STATUS_CONFIG[statusKey];

          return (
            <article
              key={tenant.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-space-2">
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: tenant.color_primario }}
                      aria-hidden="true"
                    />
                    <p className="truncate font-medium text-slate-900">
                      {tenant.nombre}
                    </p>
                  </div>
                  <p className="mt-0.5 font-mono text-sm text-slate-500">
                    {tenant.slug}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 flex-shrink-0 text-slate-500"
                      aria-label={`Acciones para ${tenant.nombre}`}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(tenant)}>
                      <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(tenant)}>
                      <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onToggleStatus(tenant)}
                      className={cn(
                        tenant.activo
                          ? 'text-destructive focus:text-destructive'
                          : 'text-green-700 focus:text-green-700'
                      )}
                    >
                      {tenant.activo ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" aria-hidden="true" />
                          Suspender
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                          Activar
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn('border-transparent', planCfg.color)}
                >
                  {planCfg.label}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn('border-transparent', statusCfg.color)}
                >
                  {statusCfg.label}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-space-4 text-xs text-slate-500">
                <span>{tenant.user_count} usuarios</span>
                <span>{tenant.member_count.toLocaleString('es-DO')} miembros</span>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
