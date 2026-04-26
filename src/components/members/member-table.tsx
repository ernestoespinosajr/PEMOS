'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  UserCircle,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { MemberListItem } from '@/types/member';
import {
  formatCedula,
  TIPO_MIEMBRO_LABELS,
  TIPO_MIEMBRO_BADGE_STYLES,
} from '@/types/member';

// ---------- Props ----------

interface MemberTableProps {
  members: MemberListItem[];
  loading: boolean;
  /** Selected member IDs for bulk operations. */
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onToggleEstado: (member: MemberListItem) => void;
}

// ---------- Loading Skeleton ----------

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <div className="h-4 w-4 rounded bg-neutral-200" />
            </TableHead>
            <TableHead>Cedula</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="hidden md:table-cell">Tipo</TableHead>
            <TableHead className="hidden lg:table-cell">Provincia</TableHead>
            <TableHead className="hidden lg:table-cell">Municipio</TableHead>
            <TableHead className="hidden xl:table-cell">Sector</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[60px]">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-4 animate-pulse rounded bg-neutral-200" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-28 animate-pulse rounded bg-neutral-200" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="h-5 w-20 animate-pulse rounded-md bg-neutral-200" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-14 animate-pulse rounded-md bg-neutral-200" />
              </TableCell>
              <TableCell>
                <div className="ml-auto h-8 w-8 animate-pulse rounded bg-neutral-200" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------- Empty State ----------

function EmptyState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface">
      <UserCircle
        size={48}
        strokeWidth={1}
        className="mb-3 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-secondary-text">
        No se encontraron miembros
      </p>
      <p className="mt-1 text-xs text-placeholder">
        Intenta ajustar los filtros o registrar un nuevo miembro.
      </p>
    </div>
  );
}

// ---------- Main Component ----------

export function MemberTable({
  members,
  loading,
  selectedIds,
  onSelectionChange,
  onToggleEstado,
}: MemberTableProps) {
  const router = useRouter();

  if (loading) return <TableSkeleton />;
  if (members.length === 0) return <EmptyState />;

  const allSelected =
    members.length > 0 && members.every((m) => selectedIds.has(m.id));
  const someSelected = members.some((m) => selectedIds.has(m.id));

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(members.map((m) => m.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  function handleRowClick(id: string) {
    router.push(`/miembros/${id}`);
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden rounded-lg border border-border bg-surface shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                  aria-label={
                    allSelected
                      ? 'Deseleccionar todos los miembros'
                      : 'Seleccionar todos los miembros'
                  }
                />
              </TableHead>
              <TableHead>Cedula</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="hidden lg:table-cell">Provincia</TableHead>
              <TableHead className="hidden lg:table-cell">Municipio</TableHead>
              <TableHead className="hidden xl:table-cell">Sector</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[60px]">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelected = selectedIds.has(member.id);
              return (
                <TableRow
                  key={member.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-primary-tint/50',
                    isSelected && 'bg-primary-tint/30'
                  )}
                  onClick={() => handleRowClick(member.id)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(member.id);
                    }
                  }}
                  aria-label={`${member.nombre} ${member.apellido} - ver detalle`}
                >
                  {/* Checkbox */}
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(member.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                      aria-label={`Seleccionar ${member.nombre} ${member.apellido}`}
                    />
                  </TableCell>

                  {/* Cedula */}
                  <TableCell className="font-mono text-sm text-primary-text">
                    {formatCedula(member.cedula)}
                  </TableCell>

                  {/* Nombre */}
                  <TableCell className="font-medium text-primary-text">
                    <div className="flex items-center gap-2">
                      {member.foto_url ? (
                        <Image
                          src={member.foto_url}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle
                          size={28}
                          strokeWidth={1}
                          className="flex-shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">
                        {member.nombre} {member.apellido}
                      </span>
                    </div>
                  </TableCell>

                  {/* Tipo */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'border-transparent text-xs',
                        TIPO_MIEMBRO_BADGE_STYLES[member.tipo_miembro]
                      )}
                    >
                      {TIPO_MIEMBRO_LABELS[member.tipo_miembro]}
                    </Badge>
                  </TableCell>

                  {/* Provincia */}
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {member.provincia_nombre ?? '--'}
                  </TableCell>

                  {/* Municipio */}
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {member.municipio_nombre ?? '--'}
                  </TableCell>

                  {/* Sector */}
                  <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                    {member.sector_nombre ?? '--'}
                  </TableCell>

                  {/* Estado */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'border-transparent text-xs',
                        member.estado
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-red-100 text-red-700 hover:bg-red-100'
                      )}
                    >
                      {member.estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Acciones para ${member.nombre} ${member.apellido}`}
                        >
                          <MoreHorizontal
                            size={16}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/miembros/${member.id}`);
                          }}
                        >
                          <Eye size={14} strokeWidth={1.5} aria-hidden="true" />
                          <span>Ver Detalle</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/miembros/${member.id}/editar`);
                          }}
                        >
                          <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleEstado(member);
                          }}
                          className={cn(
                            member.estado
                              ? 'text-destructive focus:text-destructive'
                              : 'text-emerald-700 focus:text-emerald-700'
                          )}
                        >
                          <Power size={14} strokeWidth={1.5} aria-hidden="true" />
                          <span>
                            {member.estado ? 'Desactivar' : 'Activar'}
                          </span>
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
        {members.map((member) => {
          const isSelected = selectedIds.has(member.id);
          return (
            <article
              key={member.id}
              className={cn(
                'rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors',
                isSelected && 'ring-2 ring-primary/30'
              )}
              onClick={() => handleRowClick(member.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRowClick(member.id);
                }
              }}
              role="link"
              tabIndex={0}
              aria-label={`${member.nombre} ${member.apellido} - ver detalle`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(member.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-neutral-300 text-primary focus:ring-primary"
                    aria-label={`Seleccionar ${member.nombre} ${member.apellido}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary-text">
                      {member.nombre} {member.apellido}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {formatCedula(member.cedula)}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 flex-shrink-0 h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Acciones para ${member.nombre} ${member.apellido}`}
                    >
                      <MoreHorizontal size={16} aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/miembros/${member.id}`);
                      }}
                    >
                      <Eye size={14} aria-hidden="true" />
                      <span>Ver Detalle</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/miembros/${member.id}/editar`);
                      }}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleEstado(member);
                      }}
                    >
                      <Power size={14} aria-hidden="true" />
                      <span>
                        {member.estado ? 'Desactivar' : 'Activar'}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    'border-transparent text-xs',
                    TIPO_MIEMBRO_BADGE_STYLES[member.tipo_miembro]
                  )}
                >
                  {TIPO_MIEMBRO_LABELS[member.tipo_miembro]}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    'border-transparent text-xs',
                    member.estado
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-red-100 text-red-700 hover:bg-red-100'
                  )}
                >
                  {member.estado ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              {(member.provincia_nombre || member.municipio_nombre) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {[member.provincia_nombre, member.municipio_nombre, member.sector_nombre]
                    .filter(Boolean)
                    .join(' > ')}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
