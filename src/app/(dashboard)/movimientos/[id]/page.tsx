'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Building2,
  Globe,
  Phone,
  Mail,
  Users,
  ChevronLeft,
  ChevronRight,
  AtSign,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Movimiento } from '@/types/movimiento';

// ---------- Tabs ----------

type TabId = 'info' | 'miembros' | 'usuarios';

const TABS: { id: TabId; label: string }[] = [
  { id: 'info', label: 'Informacion' },
  { id: 'miembros', label: 'Miembros' },
  { id: 'usuarios', label: 'Usuarios' },
];

// ---------- Info Detail Row ----------

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-primary-text">{value || '—'}</dd>
    </div>
  );
}

// ---------- Info Tab ----------

function InfoTab({
  movimiento,
  isAdmin,
}: {
  movimiento: Movimiento;
  isAdmin: boolean;
}) {
  const redesSociales = movimiento.redes_sociales ?? {};

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`/movimientos/${movimiento.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Editar
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-primary-text">
              Datos Generales
            </h3>
            <dl className="space-y-3">
              <DetailRow label="Nombre" value={movimiento.nombre} />
              <DetailRow label="Siglas" value={movimiento.siglas} />
              <DetailRow label="Tipo de estructura" value={movimiento.tipo_estructura} />
              <DetailRow
                label="Estado"
                value={
                  <Badge
                    variant="secondary"
                    className={cn(
                      'border-transparent',
                      movimiento.estado
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {movimiento.estado ? 'Activo' : 'Inactivo'}
                  </Badge>
                }
              />
              <DetailRow
                label="Fecha de fundacion"
                value={
                  movimiento.fecha_fundacion
                    ? new Date(movimiento.fecha_fundacion).toLocaleDateString('es-DO')
                    : null
                }
              />
              <DetailRow
                label="Ambito de accion"
                value={movimiento.ambito_accion?.join(', ')}
              />
              <DetailRow label="Descripcion" value={movimiento.descripcion} />
              <DetailRow
                label="Ejes de trabajo"
                value={movimiento.ejes_trabajo?.join(', ')}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-primary-text">
              Representante Principal
            </h3>
            <dl className="space-y-3">
              <DetailRow label="Nombre" value={movimiento.representante_nombre} />
              <DetailRow label="Cedula" value={movimiento.representante_cedula} />
              <DetailRow label="Cargo" value={movimiento.representante_cargo} />
              <DetailRow
                label="Telefono"
                value={
                  movimiento.representante_telefono ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      {movimiento.representante_telefono}
                    </span>
                  ) : null
                }
              />
              <DetailRow
                label="Correo"
                value={
                  movimiento.representante_email ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      {movimiento.representante_email}
                    </span>
                  ) : null
                }
              />
              <DetailRow label="Direccion" value={movimiento.representante_direccion} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-primary-text">
              Base Organizativa
            </h3>
            <dl className="space-y-3">
              <DetailRow
                label="Cantidad estimada de miembros"
                value={movimiento.cantidad_miembros_estimada}
              />
              <DetailRow
                label="Estructura territorial"
                value={movimiento.estructura_territorial?.join(', ')}
              />
              <DetailRow
                label="Zonas / Comunidades"
                value={movimiento.zonas_comunidades}
              />
              <DetailRow
                label="Experiencia previa"
                value={movimiento.experiencia_previa}
              />
            </dl>
          </CardContent>
        </Card>

        {(redesSociales.website || redesSociales.instagram || redesSociales.twitter ||
          (movimiento.equipo_enlace && movimiento.equipo_enlace.length > 0)) && (
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary-text">
                Redes Sociales y Contactos
              </h3>
              <dl className="space-y-3">
                {redesSociales.website && (
                  <DetailRow
                    label="Website"
                    value={
                      <a
                        href={redesSociales.website as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                        {redesSociales.website as string}
                      </a>
                    }
                  />
                )}
                {redesSociales.instagram && (
                  <DetailRow
                    label="Instagram"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                        {redesSociales.instagram as string}
                      </span>
                    }
                  />
                )}
                {redesSociales.twitter && (
                  <DetailRow
                    label="Twitter / X"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                        {redesSociales.twitter as string}
                      </span>
                    }
                  />
                )}
              </dl>

              {movimiento.equipo_enlace && movimiento.equipo_enlace.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Equipo de Enlace
                  </p>
                  <ul className="space-y-2">
                    {movimiento.equipo_enlace.map((c, idx) => (
                      <li key={idx} className="text-sm">
                        <span className="font-medium text-primary-text">{c.nombre}</span>
                        {c.email && (
                          <span className="ml-2 text-muted-foreground">{c.email}</span>
                        )}
                        {c.telefono && (
                          <span className="ml-2 text-muted-foreground">{c.telefono}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------- Pagination ----------

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between" aria-label="Paginacion">
      <p className="text-sm text-muted-foreground">
        Mostrando{' '}
        <span className="font-medium text-primary-text">{from}</span>
        {' - '}
        <span className="font-medium text-primary-text">{to}</span>
        {' de '}
        <span className="font-medium text-primary-text">{total.toLocaleString('es-DO')}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Pagina anterior"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Pagina siguiente"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

// ---------- Miembros Tab ----------

interface MiembroRow {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  tipo_miembro: string;
  estado: boolean;
}

const PAGE_SIZE = 25;

function MiembrosTab({ movimientoId }: { movimientoId: string }) {
  const [miembros, setMiembros] = useState<MiembroRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchMiembros = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(
        `/api/movimientos/${movimientoId}/miembros?page=${page}&limit=${PAGE_SIZE}`
      );
      const json = await res.json();

      if (!res.ok) {
        setFetchError(json.error ?? 'Error al obtener miembros');
        return;
      }

      setMiembros(json.miembros ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setFetchError('Error de conexion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [movimientoId, page]);

  useEffect(() => {
    fetchMiembros();
  }, [fetchMiembros]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando miembros...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div
        className="rounded-md border border-destructive/20 bg-destructive/5 p-4"
        role="alert"
      >
        <p className="text-sm text-destructive">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={fetchMiembros} className="mt-2">
          Reintentar
        </Button>
      </div>
    );
  }

  if (miembros.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border">
        <Users className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No hay miembros en este movimiento.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Apellido</TableHead>
              <TableHead>Cedula</TableHead>
              <TableHead>Tipo Miembro</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {miembros.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.nombre}</TableCell>
                <TableCell>{m.apellido}</TableCell>
                <TableCell className="text-muted-foreground">{m.cedula || '—'}</TableCell>
                <TableCell className="capitalize">{m.tipo_miembro}</TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-space-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

// ---------- Usuarios Tab ----------

interface UsuarioRow {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  role: string;
  estado: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Admin Plataforma',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  coordinator: 'Coordinador',
  observer: 'Observador',
  field_worker: 'Trabajador de Campo',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  platform_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-teal-100 text-teal-800',
  coordinator: 'bg-green-100 text-green-800',
  observer: 'bg-yellow-100 text-yellow-800',
  field_worker: 'bg-gray-100 text-gray-800',
};

function UsuariosTab({ movimientoId }: { movimientoId: string }) {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/movimientos/${movimientoId}/usuarios`);
      const json = await res.json();

      if (!res.ok) {
        setFetchError(json.error ?? 'Error al obtener usuarios');
        return;
      }

      setUsuarios(json.usuarios ?? []);
    } catch {
      setFetchError('Error de conexion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [movimientoId]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando usuarios...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div
        className="rounded-md border border-destructive/20 bg-destructive/5 p-4"
        role="alert"
      >
        <p className="text-sm text-destructive">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={fetchUsuarios} className="mt-2">
          Reintentar
        </Button>
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border">
        <Users className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          No hay usuarios asignados a este movimiento.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {u.nombre} {u.apellido}
              </TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    'border-transparent',
                    ROLE_BADGE_STYLES[u.role] ?? 'bg-gray-100 text-gray-800'
                  )}
                >
                  {ROLE_LABELS[u.role] ?? u.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    'border-transparent',
                    u.estado
                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                      : 'bg-red-100 text-red-800 hover:bg-red-100'
                  )}
                >
                  {u.estado ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------- Page ----------

export default function MovimientoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [movimiento, setMovimiento] = useState<Movimiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkRole() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const parts = session.access_token.split('.');
          const payload = JSON.parse(atob(parts[1] ?? ''));
          const role = payload.app_role as string;
          setIsAdmin(role === 'admin' || role === 'platform_admin');
        }
      } catch {
        // Non-fatal
      }
    }
    checkRole();
  }, []);

  const fetchMovimiento = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/movimientos/${id}`);
      const json = await res.json();

      if (!res.ok) {
        setFetchError(json.error ?? 'Error al obtener el movimiento');
        return;
      }

      setMovimiento(json.movimiento ?? null);
    } catch {
      setFetchError('Error de conexion. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMovimiento();
  }, [fetchMovimiento]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Cargando movimiento...</span>
      </div>
    );
  }

  if (fetchError || !movimiento) {
    return (
      <div>
        <Link
          href="/movimientos"
          className="mb-space-4 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Movimientos
        </Link>
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 p-4"
          role="alert"
        >
          <p className="text-sm text-destructive">
            {fetchError ?? 'Movimiento no encontrado.'}
          </p>
          <Button variant="outline" size="sm" onClick={fetchMovimiento} className="mt-2">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-space-6">
        <Link
          href="/movimientos"
          className="mb-space-2 inline-flex items-center gap-1 text-sm text-secondary-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a Movimientos
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-tint">
              <Building2 size={20} className="text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary-text">
                {movimiento.nombre}
              </h2>
              {movimiento.siglas && (
                <p className="text-sm text-secondary-text">{movimiento.siglas}</p>
              )}
            </div>
          </div>

          <Badge
            variant="secondary"
            className={cn(
              'border-transparent',
              movimiento.estado
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {movimiento.estado ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="border-b border-border px-6">
          <nav
            className="-mb-px flex gap-6"
            aria-label="Pestanas del movimiento"
            role="tablist"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tab-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'border-b-2 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-primary-text'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div
            id="tab-panel-info"
            role="tabpanel"
            aria-labelledby="tab-info"
            hidden={activeTab !== 'info'}
          >
            {activeTab === 'info' && (
              <InfoTab movimiento={movimiento} isAdmin={isAdmin} />
            )}
          </div>

          <div
            id="tab-panel-miembros"
            role="tabpanel"
            aria-labelledby="tab-miembros"
            hidden={activeTab !== 'miembros'}
          >
            {activeTab === 'miembros' && <MiembrosTab movimientoId={id} />}
          </div>

          <div
            id="tab-panel-usuarios"
            role="tabpanel"
            aria-labelledby="tab-usuarios"
            hidden={activeTab !== 'usuarios'}
          >
            {activeTab === 'usuarios' && <UsuariosTab movimientoId={id} />}
          </div>
        </div>
      </div>
    </div>
  );
}
