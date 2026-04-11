'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Network, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HierarchyBreadcrumb } from '@/components/hierarchy/hierarchy-breadcrumb';
import { HierarchyTable } from '@/components/hierarchy/hierarchy-table';
import {
  CreateEntityDialog,
  EditEntityDialog,
} from '@/components/hierarchy/entity-form-dialog';
import {
  HierarchySearch,
  LEVEL_BADGE_COLORS,
} from '@/components/hierarchy/hierarchy-search';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type {
  HierarchyEntity,
  HierarchyLevel,
  HierarchyBreadcrumbItem,
} from '@/types/hierarchy';
import {
  HIERARCHY_ORDER,
  LEVEL_LABELS,
  LEVEL_TABLE,
  LEVEL_PARENT_FK,
  getChildLevel,
  getParentLevel,
} from '@/types/hierarchy';

// ---------- Helpers ----------

/**
 * Fetch entities for a given level, optionally filtered by parent ID.
 * Returns normalized HierarchyEntity[].
 */
async function fetchEntities(
  level: HierarchyLevel,
  parentId: string | null
): Promise<HierarchyEntity[]> {
  const supabase = createClient();
  const table = LEVEL_TABLE[level];
  const parentFk = LEVEL_PARENT_FK[level];

  let query = supabase.from(table).select('*').order('nombre');

  // Filter by parent if applicable
  if (parentFk && parentId) {
    query = query.eq(parentFk, parentId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  // Normalize rows into HierarchyEntity shape
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    nombre: row.nombre as string,
    codigo:
      level === 'circunscripcion'
        ? String(row.numero ?? '')
        : (row.codigo as string) ?? '',
    estado: (row.estado as boolean) ?? true,
    level,
    member_count: null,
    created_at: (row.created_at as string) ?? '',
  }));
}

/**
 * Fetch member counts for provincias and municipios from materialized views.
 * For lower levels there are no materialized views, so counts stay null.
 */
async function fetchMemberCounts(
  level: HierarchyLevel,
  entityIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (entityIds.length === 0) return counts;

  const supabase = createClient();

  if (level === 'provincia') {
    const { data } = await supabase
      .from('mv_member_count_by_provincia')
      .select('provincia_id, total_miembros')
      .in('provincia_id', entityIds);

    if (data) {
      for (const row of data) {
        if (row.provincia_id && row.total_miembros != null) {
          counts.set(row.provincia_id, row.total_miembros);
        }
      }
    }
  } else if (level === 'municipio') {
    const { data } = await supabase
      .from('mv_member_count_by_municipio')
      .select('municipio_id, total_miembros')
      .in('municipio_id', entityIds);

    if (data) {
      for (const row of data) {
        if (row.municipio_id && row.total_miembros != null) {
          counts.set(row.municipio_id, row.total_miembros);
        }
      }
    }
  }

  return counts;
}

/**
 * Build the breadcrumb trail by walking up the parent chain.
 */
async function buildBreadcrumb(
  level: HierarchyLevel,
  parentId: string | null
): Promise<HierarchyBreadcrumbItem[]> {
  if (!parentId) return [];

  const supabase = createClient();
  const crumbs: HierarchyBreadcrumbItem[] = [];

  // Walk up: the parentId belongs to the level above the current one
  let currentLevel = getParentLevel(level);
  let currentId: string | null = parentId;

  while (currentLevel && currentId) {
    const table = LEVEL_TABLE[currentLevel];
    const parentFk = LEVEL_PARENT_FK[currentLevel];

    const { data } = await supabase
      .from(table)
      .select('id, nombre' + (parentFk ? `, ${parentFk}` : ''))
      .eq('id', currentId)
      .single();

    if (!data) break;

    crumbs.unshift({
      label: data.nombre as string,
      level: currentLevel,
      id: data.id as string,
    });

    // Move up
    currentId = parentFk
      ? ((data as Record<string, unknown>)[parentFk] as string | null)
      : null;
    currentLevel = getParentLevel(currentLevel);
  }

  return crumbs;
}

// ---------- Stats Card ----------

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            color ?? 'bg-primary-tint'
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
          <p className="text-xl font-bold text-primary-text">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================================
// MAIN PAGE COMPONENT
// ==========================================================

function JerarquiaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current view state derived from URL params
  const levelParam = (searchParams.get('level') as HierarchyLevel) || 'provincia';
  const parentIdParam = searchParams.get('parentId') || null;

  // Data state
  const [entities, setEntities] = useState<HierarchyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState<HierarchyBreadcrumbItem[]>([]);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] =
    useState<HierarchyEntity | null>(null);

  // Derived state
  const currentLevel: HierarchyLevel = HIERARCHY_ORDER.includes(levelParam)
    ? levelParam
    : 'provincia';
  const labels = LEVEL_LABELS[currentLevel];
  const totalCount = entities.length;
  const activeCount = entities.filter((e) => e.estado).length;
  const totalMembers = entities.reduce(
    (sum, e) => sum + (e.member_count ?? 0),
    0
  );

  // Parent name for the create dialog
  const parentName =
    breadcrumb.length > 0
      ? breadcrumb[breadcrumb.length - 1].label
      : null;

  // ---------- Data Fetching ----------

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch entities and breadcrumb in parallel
      const [rawEntities, crumbs] = await Promise.all([
        fetchEntities(currentLevel, parentIdParam),
        buildBreadcrumb(currentLevel, parentIdParam),
      ]);

      // Fetch member counts (only for provincia and municipio)
      const ids = rawEntities.map((e) => e.id);
      const counts = await fetchMemberCounts(currentLevel, ids);

      // Merge counts into entities
      const withCounts = rawEntities.map((e) => ({
        ...e,
        member_count: counts.get(e.id) ?? e.member_count,
      }));

      setEntities(withCounts);
      setBreadcrumb(crumbs);
    } catch (err) {
      console.error('Error loading hierarchy data:', err);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, [currentLevel, parentIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- Navigation ----------

  function navigateTo(level: HierarchyLevel, parentId: string | null) {
    const params = new URLSearchParams();
    params.set('level', level);
    if (parentId) params.set('parentId', parentId);
    router.push(`/jerarquia?${params.toString()}`);
  }

  /** Drill down into a child level. */
  function handleDrillDown(entity: HierarchyEntity) {
    const childLevel = getChildLevel(entity.level);
    if (!childLevel) return;
    navigateTo(childLevel, entity.id);
  }

  /** Navigate up via breadcrumb click. */
  function handleBreadcrumbNavigate(item: HierarchyBreadcrumbItem | null) {
    if (!item) {
      // Go to root (provincias)
      router.push('/jerarquia');
      return;
    }
    // Navigate to this item's children
    const childLevel = getChildLevel(item.level);
    if (childLevel) {
      navigateTo(childLevel, item.id);
    }
  }

  /** Handle search result selection. */
  async function handleSearchSelect(level: HierarchyLevel, id: string) {
    // For the selected entity, we need to navigate to its parent level
    // showing itself in context. Find its parent ID.
    const supabase = createClient();
    const table = LEVEL_TABLE[level];
    const parentFk = LEVEL_PARENT_FK[level];

    if (!parentFk) {
      // Provincia selected -- just go to root
      router.push('/jerarquia');
      return;
    }

    const { data } = await supabase
      .from(table)
      .select(parentFk)
      .eq('id', id)
      .single();

    if (data) {
      const pId = (data as Record<string, unknown>)[parentFk] as string;
      navigateTo(level, pId);
    }
  }

  // ---------- CRUD Handlers ----------

  function handleEdit(entity: HierarchyEntity) {
    setSelectedEntity(entity);
    setEditOpen(true);
  }

  async function handleToggleEstado(entity: HierarchyEntity) {
    const supabase = createClient();
    const table = LEVEL_TABLE[entity.level];

    const { error } = await supabase
      .from(table)
      .update({ estado: !entity.estado })
      .eq('id', entity.id);

    if (!error) {
      loadData();
    }
  }

  function handleMutationSuccess() {
    loadData();
  }

  // ---------- Render ----------

  return (
    <div>
      {/* Page Header */}
      <div className="mb-space-6 flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">
            Jerarquia Geografica
          </h2>
          <p className="mt-space-1 text-sm text-secondary-text">
            Estructura organizacional por nivel geografico
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="sm:flex-shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Crear {labels.singular}
        </Button>
      </div>

      {/* Search */}
      <div className="mb-space-4 max-w-sm">
        <HierarchySearch onSelect={handleSearchSelect} />
      </div>

      {/* Breadcrumb */}
      <HierarchyBreadcrumb
        items={breadcrumb}
        currentLevelLabel={labels.plural}
        onNavigate={handleBreadcrumbNavigate}
      />

      {/* Stats Cards */}
      <div className="mb-space-6 grid grid-cols-1 gap-space-4 sm:grid-cols-3">
        <StatCard
          label={`Total ${labels.plural}`}
          value={loading ? '--' : totalCount.toLocaleString('es-DO')}
          icon={Network}
          color="bg-blue-50"
        />
        <StatCard
          label="Activos"
          value={loading ? '--' : activeCount.toLocaleString('es-DO')}
          icon={CheckCircle}
          color="bg-emerald-50"
        />
        <StatCard
          label="Total Miembros"
          value={loading ? '--' : totalMembers.toLocaleString('es-DO')}
          icon={Users}
          color="bg-purple-50"
        />
      </div>

      {/* Current level badge */}
      <div className="mb-space-4 flex items-center gap-2">
        <Badge
          className={cn(
            'text-xs font-medium border-0',
            LEVEL_BADGE_COLORS[currentLevel]
          )}
        >
          {labels.plural}
        </Badge>
        {!loading && (
          <span className="text-sm text-muted-foreground">
            {totalCount} registro{totalCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Data Table */}
      <HierarchyTable
        entities={entities}
        level={currentLevel}
        loading={loading}
        onDrillDown={handleDrillDown}
        onEdit={handleEdit}
        onToggleEstado={handleToggleEstado}
      />

      {/* Create Dialog */}
      <CreateEntityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        level={currentLevel}
        parentId={parentIdParam}
        parentName={parentName}
        onSuccess={handleMutationSuccess}
      />

      {/* Edit Dialog */}
      <EditEntityDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        entity={selectedEntity}
        level={currentLevel}
        onSuccess={handleMutationSuccess}
      />
    </div>
  );
}

/* ---------- Page export (Suspense boundary for useSearchParams) ---------- */
export default function JerarquiaPage() {
  return (
    <Suspense>
      <JerarquiaContent />
    </Suspense>
  );
}
