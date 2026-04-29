'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Movimiento } from '@/types/movimiento';

const TIPO_ESTRUCTURA_LABELS: Record<string, string> = {
  Movimiento: 'Movimiento',
  Comite: 'Comite',
  Frente: 'Frente',
  Otro: 'Otro',
};

function MovimientosTable({
  movimientos,
  loading,
  onEdit,
  onDelete,
  isTenantAdmin,
}: {
  movimientos: Movimiento[];
  loading: boolean;
  onEdit: (m: Movimiento) => void;
  onDelete: (m: Movimiento) => void;
  isTenantAdmin: boolean;
}) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando movimientos...</span>
      </div>
    );
  }

  if (movimientos.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border">
        <Building2 className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-primary-text">No hay movimientos registrados</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea el primer sub-organizacion para comenzar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Nombre</TableHead>
              <TableHead className="w-[100px]">Siglas</TableHead>
              <TableHead>Tipo Estructura</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Fecha Fundacion</TableHead>
              <TableHead className="w-[60px]">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((m) => (
              <TableRow
                key={m.id}
                className="cursor-pointer"
                onClick={() => router.push(`/movimientos/${m.id}`)}
              >
                <TableCell className="font-medium">{m.nombre}</TableCell>
                <TableCell className="text-muted-foreground">
                  {m.siglas ?? '—'}
                </TableCell>
                <TableCell>
                  {TIPO_ESTRUCTURA_LABELS[m.tipo_estructura] ?? m.tipo_estructura}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'border-transparent',
                      m.estado
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {m.estado ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {m.fecha_fundacion
                    ? new Date(m.fecha_fundacion).toLocaleDateString('es-DO')
                    : '—'}
                </TableCell>
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Acciones para ${m.nombre}`}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/movimientos/${m.id}`}>
                          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                          Ver
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(m)}>
                        <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                        Editar
                      </DropdownMenuItem>
                      {isTenantAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(m)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {movimientos.map((m) => (
          <article
            key={m.id}
            className="rounded-lg border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/movimientos/${m.id}`}
                  className="truncate font-medium text-primary-text hover:text-primary"
                >
                  {m.nombre}
                </Link>
                {m.siglas && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{m.siglas}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 flex-shrink-0"
                    aria-label={`Acciones para ${m.nombre}`}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/movimientos/${m.id}`}>
                      <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                      Ver
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(m)}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Editar
                  </DropdownMenuItem>
                  {isTenantAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(m)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  'border-transparent',
                  m.estado
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                )}
              >
                {m.estado ? 'Activo' : 'Inactivo'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {TIPO_ESTRUCTURA_LABELS[m.tipo_estructura] ?? m.tipo_estructura}
              </span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function DeleteMovimientoDialog({
  movimiento,
  open,
  onOpenChange,
  onSuccess,
}: {
  movimiento: Movimiento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setApiError(null);
  }, [open]);

  async function handleDelete() {
    if (!movimiento) return;
    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch(`/api/movimientos/${movimiento.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? 'Error al eliminar movimiento');
        setSubmitting(false);
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setApiError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Movimiento</DialogTitle>
          <DialogDescription>
            {movimiento
              ? `¿Estas seguro de que deseas eliminar "${movimiento.nombre}"?`
              : '¿Estas seguro de que deseas eliminar este movimiento?'}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Esta accion es irreversible. Todos los datos asociados al movimiento
          seran eliminados permanentemente.
        </p>

        {apiError && (
          <div
            className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
            role="alert"
            aria-live="polite"
          >
            <p className="text-sm text-destructive">{apiError}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MovimientosPage() {
  const router = useRouter();

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState<Movimiento | null>(null);

  useEffect(() => {
    async function checkTenantAdmin() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const token = session.access_token;
          const payload = token.split('.')[1];
          if (payload) {
            const claims = JSON.parse(atob(payload));
            setIsTenantAdmin(claims.app_role === 'admin' && !claims.movimiento_id);
          }
        }
      } catch {
        // Non-fatal: defaults to false (hidden)
      }
    }
    checkTenantAdmin();
  }, []);

  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/movimientos');
      const json = await res.json();

      if (!res.ok) {
        setFetchError(json.error ?? 'Error al obtener movimientos');
        return;
      }

      setMovimientos(json.movimientos ?? []);
    } catch {
      setFetchError('Error de conexion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  function handleEdit(m: Movimiento) {
    router.push(`/movimientos/${m.id}/editar`);
  }

  function handleDelete(m: Movimiento) {
    setSelectedMovimiento(m);
    setDeleteOpen(true);
  }

  function handleMutationSuccess() {
    fetchMovimientos();
    router.refresh();
  }

  const filtered = searchQuery
    ? movimientos.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          m.nombre.toLowerCase().includes(q) ||
          (m.siglas?.toLowerCase().includes(q) ?? false) ||
          m.tipo_estructura.toLowerCase().includes(q)
        );
      })
    : movimientos;

  return (
    <div>
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Movimientos
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Administra las sub-organizaciones y movimientos del sistema.
          </p>
        </div>
        <Button asChild className="sm:flex-shrink-0">
          <Link href="/movimientos/nuevo">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo Movimiento
          </Link>
        </Button>
      </div>

      <div className="mb-space-4">
        <div className="relative max-w-sm">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar por nombre, siglas o tipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Buscar movimientos"
          />
        </div>
      </div>

      {fetchError && (
        <div
          className="mb-space-4 rounded-md border border-destructive/20 bg-destructive/5 p-4"
          role="alert"
        >
          <p className="text-sm text-destructive">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={fetchMovimientos} className="mt-2">
            Reintentar
          </Button>
        </div>
      )}

      {!loading && !fetchError && (
        <p className="mb-space-4 text-sm text-muted-foreground">
          {filtered.length === movimientos.length
            ? `${movimientos.length} movimiento${movimientos.length !== 1 ? 's' : ''} en total`
            : `${filtered.length} de ${movimientos.length} movimientos`}
        </p>
      )}

      <MovimientosTable
        movimientos={filtered}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isTenantAdmin={isTenantAdmin}
      />

      <DeleteMovimientoDialog
        movimiento={selectedMovimiento}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={handleMutationSuccess}
      />
    </div>
  );
}
