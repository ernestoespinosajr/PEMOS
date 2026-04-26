'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Users,
  UserCheck,
  UsersRound,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Power,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MemberTable } from '@/components/members/member-table';
import { MemberFiltersBar } from '@/components/members/member-filters';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { MemberListItem, MemberFilters, MemberStats } from '@/types/member';
import { PAGE_SIZE } from '@/types/member';

// ---------- Stats Card ----------

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, color, loading }: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            color
          )}
        >
          <Icon
            size={20}
            strokeWidth={1.5}
            className="text-primary"
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm text-secondary-text">{label}</p>
          {loading ? (
            <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-200" />
          ) : (
            <p className="text-xl font-bold text-primary-text">
              {typeof value === 'number' ? value.toLocaleString('es-DO') : value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build visible page numbers: show up to 5 pages centered on current
  const pages: (number | 'ellipsis')[] = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <nav
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
      aria-label="Paginacion de miembros"
    >
      <p className="text-sm text-muted-foreground">
        Mostrando{' '}
        <span className="font-medium text-primary-text">{from}</span>
        {' - '}
        <span className="font-medium text-primary-text">{to}</span>
        {' de '}
        <span className="font-medium text-primary-text">
          {total.toLocaleString('es-DO')}
        </span>
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

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1 text-sm text-muted-foreground"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPageChange(p)}
              aria-label={`Pagina ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          )
        )}

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

// ---------- Bulk Action Bar ----------

interface BulkActionBarProps {
  count: number;
  onDeselectAll: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
}

function BulkActionBar({
  count,
  onDeselectAll,
  onBulkActivate,
  onBulkDeactivate,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary-tint/50 px-4 py-3">
      <span className="text-sm font-medium text-primary-text">
        {count} miembro{count !== 1 ? 's' : ''} seleccionado
        {count !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onBulkActivate}>
          <Power size={14} className="mr-1.5" aria-hidden="true" />
          Activar
        </Button>
        <Button variant="outline" size="sm" onClick={onBulkDeactivate}>
          <Power size={14} className="mr-1.5" aria-hidden="true" />
          Desactivar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          className="text-muted-foreground"
        >
          Deseleccionar
        </Button>
      </div>
    </div>
  );
}

// ==========================================================
// MAIN PAGE CONTENT
// ==========================================================

function MiembrosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---------- URL-driven filter state ----------

  function filtersFromParams(): MemberFilters {
    return {
      search: searchParams.get('search') ?? '',
      tipo_miembro:
        (searchParams.get('tipo') as MemberFilters['tipo_miembro']) ?? '',
      provincia_id: searchParams.get('provincia') ?? '',
      municipio_id: searchParams.get('municipio') ?? '',
      circunscripcion_id: searchParams.get('circunscripcion') ?? '',
      sector_id: searchParams.get('sector') ?? '',
      estado:
        (searchParams.get('estado') as MemberFilters['estado']) ?? 'all',
      page: parseInt(searchParams.get('page') ?? '1', 10) || 1,
    };
  }

  const [filters, setFilters] = useState<MemberFilters>(filtersFromParams);

  // Data state
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<MemberStats>({
    total: 0,
    coordinadores: 0,
    multiplicadores: 0,
    relacionados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ---------- Sync filters to URL ----------

  const pushFiltersToUrl = useCallback(
    (f: MemberFilters) => {
      const params = new URLSearchParams();
      if (f.search) params.set('search', f.search);
      if (f.tipo_miembro) params.set('tipo', f.tipo_miembro);
      if (f.provincia_id) params.set('provincia', f.provincia_id);
      if (f.municipio_id) params.set('municipio', f.municipio_id);
      if (f.circunscripcion_id)
        params.set('circunscripcion', f.circunscripcion_id);
      if (f.sector_id) params.set('sector', f.sector_id);
      if (f.estado !== 'all') params.set('estado', f.estado);
      if (f.page > 1) params.set('page', String(f.page));

      const qs = params.toString();
      router.push(`/miembros${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router]
  );

  function handleFiltersChange(next: MemberFilters) {
    setFilters(next);
    setSelectedIds(new Set());
    pushFiltersToUrl(next);
  }

  function handlePageChange(page: number) {
    const next = { ...filters, page };
    setFilters(next);
    setSelectedIds(new Set());
    pushFiltersToUrl(next);
    // Scroll to top of the table area
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Fetch members ----------

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from('miembros')
        .select(
          `
          id,
          cedula,
          nombre,
          apellido,
          tipo_miembro,
          estado,
          foto_url,
          telefono,
          celular,
          email,
          sector_id,
          coordinador_id,
          created_at,
          sectores(nombre),
          coordinador:miembros!coordinador_id(nombre, apellido)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        // Search across nombre, apellido, and cedula
        const term = `%${filters.search}%`;
        query = query.or(
          `nombre.ilike.${term},apellido.ilike.${term},cedula.ilike.${term}`
        );
      }

      if (filters.tipo_miembro) {
        query = query.eq('tipo_miembro', filters.tipo_miembro);
      }

      if (filters.sector_id) {
        query = query.eq('sector_id', filters.sector_id);
      } else if (filters.circunscripcion_id) {
        // Filter by circunscripcion: get all sectors in this circunscripcion
        const { data: sectorRows } = await supabase
          .from('sectores')
          .select('id')
          .eq('circunscripcion_id', filters.circunscripcion_id);
        if (sectorRows && sectorRows.length > 0) {
          query = query.in(
            'sector_id',
            sectorRows.map((s) => s.id)
          );
        }
      } else if (filters.municipio_id) {
        // Filter by municipio: get circunscripciones -> sectors
        const { data: circRows } = await supabase
          .from('circunscripciones')
          .select('id')
          .eq('municipio_id', filters.municipio_id);
        if (circRows && circRows.length > 0) {
          const { data: sectorRows } = await supabase
            .from('sectores')
            .select('id')
            .in(
              'circunscripcion_id',
              circRows.map((c) => c.id)
            );
          if (sectorRows && sectorRows.length > 0) {
            query = query.in(
              'sector_id',
              sectorRows.map((s) => s.id)
            );
          }
        }
      } else if (filters.provincia_id) {
        // Filter by provincia: municipios -> circunscripciones -> sectors
        const { data: munRows } = await supabase
          .from('municipios')
          .select('id')
          .eq('provincia_id', filters.provincia_id);
        if (munRows && munRows.length > 0) {
          const { data: circRows } = await supabase
            .from('circunscripciones')
            .select('id')
            .in(
              'municipio_id',
              munRows.map((m) => m.id)
            );
          if (circRows && circRows.length > 0) {
            const { data: sectorRows } = await supabase
              .from('sectores')
              .select('id')
              .in(
                'circunscripcion_id',
                circRows.map((c) => c.id)
              );
            if (sectorRows && sectorRows.length > 0) {
              query = query.in(
                'sector_id',
                sectorRows.map((s) => s.id)
              );
            }
          }
        }
      }

      if (filters.estado === 'active') {
        query = query.eq('estado', true);
      } else if (filters.estado === 'inactive') {
        query = query.eq('estado', false);
      }

      // Pagination
      const from = (filters.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('Error fetching members:', error);
        setMembers([]);
        setTotal(0);
        return;
      }

      // Transform joined data into MemberListItem shape
      const items: MemberListItem[] = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const sector = r.sectores as { nombre: string } | null;
        const coord = r.coordinador as {
          nombre: string;
          apellido: string;
        } | null;

        return {
          id: r.id as string,
          cedula: r.cedula as string,
          nombre: r.nombre as string,
          apellido: r.apellido as string,
          apodo: null,
          tipo_miembro: r.tipo_miembro as MemberListItem['tipo_miembro'],
          estado: r.estado as boolean,
          foto_url: r.foto_url as string | null,
          telefono: r.telefono as string | null,
          celular: r.celular as string | null,
          email: r.email as string | null,
          sector_id: r.sector_id as string | null,
          coordinador_id: r.coordinador_id as string | null,
          coordinador_nombre: coord
            ? `${coord.nombre} ${coord.apellido}`
            : null,
          sector_nombre: sector?.nombre ?? null,
          circunscripcion_nombre: null,
          municipio_nombre: null,
          provincia_nombre: null,
          created_at: r.created_at as string,
        };
      });

      setMembers(items);
      setTotal(count ?? 0);
    } catch (err) {
      console.error('Error fetching members:', err);
      setMembers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ---------- Fetch stats ----------

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient();

      const [totalRes, coordRes, multiRes, relRes] = await Promise.all([
        supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_miembro', 'coordinador'),
        supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_miembro', 'multiplicador'),
        supabase
          .from('miembros')
          .select('id', { count: 'exact', head: true })
          .eq('tipo_miembro', 'relacionado'),
      ]);

      setStats({
        total: totalRes.count ?? 0,
        coordinadores: coordRes.count ?? 0,
        multiplicadores: multiRes.count ?? 0,
        relacionados: relRes.count ?? 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ---------- Effects ----------

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ---------- Handlers ----------

  async function handleToggleEstado(member: MemberListItem) {
    const supabase = createClient();
    const { error } = await supabase
      .from('miembros')
      .update({ estado: !member.estado })
      .eq('id', member.id);

    if (!error) {
      fetchMembers();
      fetchStats();
    }
  }

  async function handleBulkStatusChange(activate: boolean) {
    if (selectedIds.size === 0) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('miembros')
      .update({ estado: activate })
      .in('id', Array.from(selectedIds));

    if (!error) {
      setSelectedIds(new Set());
      fetchMembers();
      fetchStats();
    }
  }

  // ---------- Render ----------

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Gestion de Miembros
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Administra los miembros de la estructura del partido
          </p>
        </div>
        <Button asChild className="sm:flex-shrink-0">
          <Link href="/miembros/nuevo">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Registrar Miembro
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-space-6 grid grid-cols-2 gap-space-4 lg:grid-cols-4">
        <StatCard
          label="Total Miembros"
          value={stats.total}
          icon={Users}
          color="bg-blue-50"
          loading={statsLoading}
        />
        <StatCard
          label="Coordinadores"
          value={stats.coordinadores}
          icon={UserCheck}
          color="bg-indigo-50"
          loading={statsLoading}
        />
        <StatCard
          label="Multiplicadores"
          value={stats.multiplicadores}
          icon={UsersRound}
          color="bg-emerald-50"
          loading={statsLoading}
        />
        <StatCard
          label="Relacionados"
          value={stats.relacionados}
          icon={UserPlus}
          color="bg-amber-50"
          loading={statsLoading}
        />
      </div>

      {/* Filters */}
      <MemberFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        className="mb-space-4"
      />

      {/* Bulk Action Bar */}
      <div className="mb-space-4">
        <BulkActionBar
          count={selectedIds.size}
          onDeselectAll={() => setSelectedIds(new Set())}
          onBulkActivate={() => handleBulkStatusChange(true)}
          onBulkDeactivate={() => handleBulkStatusChange(false)}
        />
      </div>

      {/* Results count */}
      {!loading && total > 0 && (
        <div className="mb-space-3">
          <span className="text-sm text-muted-foreground">
            {total.toLocaleString('es-DO')} miembro
            {total !== 1 ? 's' : ''} encontrado
            {total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Member Table */}
      <MemberTable
        members={members}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onToggleEstado={handleToggleEstado}
      />

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-space-6">
          <Pagination
            page={filters.page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

// ---------- Page Export (Suspense boundary for useSearchParams) ----------

export default function MiembrosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-label="Cargando miembros"
          />
        </div>
      }
    >
      <MiembrosContent />
    </Suspense>
  );
}
