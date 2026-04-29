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
import { MoreHorizontal, Pencil, UserX, Loader2, KeyRound, Building2 } from 'lucide-react';
import { ROLES } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import type { AdminUser } from '@/types/admin';
import type { UserRole } from '@/types/auth';

// ---------- Role Badge Colors ----------

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  platform_admin: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  admin: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  supervisor: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
  coordinator: 'bg-green-100 text-green-800 hover:bg-green-100',
  observer: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  field_worker: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
};

// ---------- Helper: Geographic scope display ----------

function getGeographicScopeLabel(user: AdminUser): string {
  if (user.circunscripcion_nombre) {
    return `Circunscripcion: ${user.circunscripcion_nombre}`;
  }
  if (user.municipio_nombre) {
    return `Municipio: ${user.municipio_nombre}`;
  }
  if (user.provincia_nombre) {
    return `Provincia: ${user.provincia_nombre}`;
  }
  if (user.role === 'admin') {
    return 'Todo el pais';
  }
  return 'Sin asignar';
}

// ---------- Component ----------

interface UsersTableProps {
  users: AdminUser[];
  loading: boolean;
  onEdit: (user: AdminUser) => void;
  onDeactivate: (user: AdminUser) => void;
  onChangePassword?: (user: AdminUser) => void;
  onReasignarMovimiento?: (user: AdminUser) => void;
}

export function UsersTable({
  users,
  loading,
  onEdit,
  onDeactivate,
  onChangePassword,
  onReasignarMovimiento,
}: UsersTableProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Cargando usuarios...</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">
          No se encontraron usuarios.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Nombre</TableHead>
              <TableHead>Correo electronico</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">
                Ambito geografico
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                Movimiento
              </TableHead>
              <TableHead className="w-[60px]">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                {/* Name */}
                <TableCell className="font-medium">
                  {user.nombre} {user.apellido}
                </TableCell>

                {/* Email */}
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>

                {/* Role Badge */}
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'border-transparent',
                      ROLE_BADGE_STYLES[user.role]
                    )}
                  >
                    {ROLES[user.role]?.label ?? user.role}
                  </Badge>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'border-transparent',
                      user.estado
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : 'bg-red-100 text-red-800 hover:bg-red-100'
                    )}
                  >
                    {user.estado ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>

                {/* Geographic Scope */}
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {getGeographicScopeLabel(user)}
                </TableCell>

                {/* Movimiento */}
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  {user.movimiento_nombre ?? '— Org. Principal'}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Acciones para ${user.nombre} ${user.apellido}`}
                      >
                        <MoreHorizontal
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                        Editar
                      </DropdownMenuItem>
                      {onChangePassword && (
                        <DropdownMenuItem onClick={() => onChangePassword(user)}>
                          <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                          Cambiar Contrasena
                        </DropdownMenuItem>
                      )}
                      {onReasignarMovimiento && (
                        <DropdownMenuItem onClick={() => onReasignarMovimiento(user)}>
                          <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                          Reasignar Movimiento
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {user.estado ? (
                        <DropdownMenuItem
                          onClick={() => onDeactivate(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserX
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          Desactivar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onEdit(user)}
                          className="text-green-700 focus:text-green-700"
                        >
                          <Pencil
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          Reactivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <article
            key={user.id}
            className="rounded-lg border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-primary-text">
                  {user.nombre} {user.apellido}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 flex-shrink-0"
                    aria-label={`Acciones para ${user.nombre} ${user.apellido}`}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(user)}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Editar
                  </DropdownMenuItem>
                  {onChangePassword && (
                    <DropdownMenuItem onClick={() => onChangePassword(user)}>
                      <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                      Cambiar Contrasena
                    </DropdownMenuItem>
                  )}
                  {onReasignarMovimiento && (
                    <DropdownMenuItem onClick={() => onReasignarMovimiento(user)}>
                      <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Reasignar Movimiento
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {user.estado ? (
                    <DropdownMenuItem
                      onClick={() => onDeactivate(user)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
                      Desactivar
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onEdit(user)}
                      className="text-green-700 focus:text-green-700"
                    >
                      <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                      Reactivar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  'border-transparent',
                  ROLE_BADGE_STYLES[user.role]
                )}
              >
                {ROLES[user.role]?.label ?? user.role}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  'border-transparent',
                  user.estado
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                )}
              >
                {user.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {getGeographicScopeLabel(user)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {user.movimiento_nombre ? `Movimiento: ${user.movimiento_nombre}` : 'Org. Principal'}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
