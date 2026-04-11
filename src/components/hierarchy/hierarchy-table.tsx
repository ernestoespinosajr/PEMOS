'use client';

import {
  ChevronRight,
  Edit,
  MoreHorizontal,
  Power,
  Users,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { HierarchyEntity, HierarchyLevel } from '@/types/hierarchy';
import { getChildLevel, LEVEL_LABELS } from '@/types/hierarchy';

interface HierarchyTableProps {
  /** Entities to display at the current level. */
  entities: HierarchyEntity[];
  /** Current hierarchy level being viewed. */
  level: HierarchyLevel;
  /** Whether data is loading. */
  loading: boolean;
  /** Drill-down into a specific entity's children. */
  onDrillDown: (entity: HierarchyEntity) => void;
  /** Edit an entity. */
  onEdit: (entity: HierarchyEntity) => void;
  /** Toggle entity active/inactive. */
  onToggleEstado: (entity: HierarchyEntity) => void;
}

/**
 * Reusable table for any hierarchy level.
 *
 * Features:
 * - Clickable rows for drill-down
 * - Status badge (Activo / Inactivo)
 * - Member count column
 * - Action menu (edit, toggle estado)
 * - Loading skeleton
 * - Empty state
 */
export function HierarchyTable({
  entities,
  level,
  loading,
  onDrillDown,
  onEdit,
  onToggleEstado,
}: HierarchyTableProps) {
  const childLevel = getChildLevel(level);
  const childLabel = childLevel
    ? LEVEL_LABELS[childLevel].plural
    : null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Nombre</TableHead>
              <TableHead className="w-[15%]">Codigo</TableHead>
              <TableHead className="w-[15%]">Estado</TableHead>
              <TableHead className="w-[15%]">Miembros</TableHead>
              <TableHead className="w-[15%] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-48 animate-pulse rounded bg-neutral-200" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
                </TableCell>
                <TableCell>
                  <div className="h-5 w-14 animate-pulse rounded-md bg-neutral-200" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-10 animate-pulse rounded bg-neutral-200" />
                </TableCell>
                <TableCell>
                  <div className="h-8 w-8 animate-pulse rounded bg-neutral-200 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (entities.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface shadow-sm">
        <div className="text-center">
          <p className="text-sm font-medium text-secondary-text">
            No se encontraron {LEVEL_LABELS[level].plural.toLowerCase()}
          </p>
          <p className="mt-1 text-xs text-placeholder">
            No hay registros en este nivel de la jerarquia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Nombre</TableHead>
            <TableHead className="w-[15%]">
              {level === 'circunscripcion' ? 'Numero' : 'Codigo'}
            </TableHead>
            <TableHead className="w-[15%]">Estado</TableHead>
            <TableHead className="w-[15%]">Miembros</TableHead>
            <TableHead className="w-[15%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => {
            const canDrillDown = childLevel !== null;
            return (
              <TableRow
                key={entity.id}
                className={cn(
                  canDrillDown &&
                    'cursor-pointer hover:bg-primary-tint/50 transition-colors'
                )}
                onClick={
                  canDrillDown ? () => onDrillDown(entity) : undefined
                }
                role={canDrillDown ? 'link' : undefined}
                tabIndex={canDrillDown ? 0 : undefined}
                onKeyDown={
                  canDrillDown
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onDrillDown(entity);
                        }
                      }
                    : undefined
                }
                aria-label={
                  canDrillDown
                    ? `${entity.nombre} - ver ${childLabel}`
                    : entity.nombre
                }
              >
                {/* Nombre */}
                <TableCell className="font-medium text-primary-text">
                  <div className="flex items-center gap-2">
                    <span>{entity.nombre}</span>
                    {canDrillDown && (
                      <ChevronRight
                        size={14}
                        strokeWidth={1.5}
                        className="text-placeholder"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </TableCell>

                {/* Codigo / Numero */}
                <TableCell className="text-secondary-text">
                  {entity.codigo}
                </TableCell>

                {/* Estado */}
                <TableCell>
                  <Badge
                    variant={entity.estado ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs',
                      entity.estado
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100'
                    )}
                  >
                    {entity.estado ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>

                {/* Miembros */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-secondary-text">
                    <Users
                      size={14}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span>
                      {entity.member_count != null
                        ? entity.member_count.toLocaleString('es-DO')
                        : '--'}
                    </span>
                  </div>
                </TableCell>

                {/* Acciones */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Acciones para ${entity.nombre}`}
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
                          onEdit(entity);
                        }}
                      >
                        <Edit
                          size={14}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <span>Editar</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleEstado(entity);
                        }}
                      >
                        <Power
                          size={14}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <span>
                          {entity.estado ? 'Desactivar' : 'Activar'}
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
  );
}
