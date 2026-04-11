import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * UUID v4 validation regex.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Maps a parent table name to the child level name expected by
 * `get_hierarchy_children`. For example, if the entity is a provincia,
 * its children are municipios, so the child level is 'municipio'.
 */
const CHILD_LEVEL: Record<string, string> = {
  provincias: 'municipio',
  municipios: 'circunscripcion',
  circunscripciones: 'sector',
  sectores: 'comite',
  comites: 'nivel_intermedio',
};

/**
 * All geographic table names, checked in hierarchical order.
 */
const TABLE_NAMES = [
  'provincias',
  'municipios',
  'circunscripciones',
  'sectores',
  'comites',
  'niveles_intermedios',
] as const;

type TableName = (typeof TABLE_NAMES)[number];

/**
 * Finds which table an entity belongs to by checking each table.
 */
async function findEntityTable(
  supabase: ReturnType<typeof createClient>,
  entityId: string
): Promise<TableName | null> {
  for (const table of TABLE_NAMES) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('id', entityId)
      .single();

    if (!error && data) {
      return table;
    }
  }
  return null;
}

/**
 * GET /api/hierarchy/[id]/children
 *
 * Returns the children of a geographic entity at the next level down,
 * with member counts from materialized views.
 *
 * The endpoint automatically determines the entity's level and fetches
 * children at the appropriate child level.
 *
 * Requires authentication (any role).
 *
 * Response:
 *   {
 *     data: [
 *       {
 *         id, nombre, codigo, estado,
 *         total_miembros, coordinadores, multiplicadores, relacionados
 *       }
 *     ],
 *     meta: {
 *       parentId, parentLevel, childLevel, count
 *     }
 *   }
 *
 * Returns 404 if entity not found.
 * Returns 400 if entity is at the lowest level (niveles_intermedios).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // -- Authentication --------------------------------------------------------
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }

  const { id } = params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'ID debe ser un UUID valido' },
      { status: 400 }
    );
  }

  // Determine which table this entity belongs to
  const table = await findEntityTable(supabase, id);

  if (!table) {
    return NextResponse.json(
      { error: 'Entidad no encontrada' },
      { status: 404 }
    );
  }

  // Check if entity is at the lowest level
  if (table === 'niveles_intermedios') {
    return NextResponse.json(
      {
        error:
          'Los niveles intermedios son el nivel mas bajo de la jerarquia. No tienen hijos.',
      },
      { status: 400 }
    );
  }

  const childLevel = CHILD_LEVEL[table];
  if (!childLevel) {
    return NextResponse.json(
      { error: 'No se pudo determinar el nivel hijo' },
      { status: 500 }
    );
  }

  // Convert plural table name to singular for meta response
  const parentLevel = table.replace(/s$/, '').replace(/cione$/, 'cion');

  // Fetch children using the RPC function
  const { data, error } = await supabase.rpc('get_hierarchy_children', {
    target_level: childLevel,
    parent_id: id,
  });

  if (error) {
    console.error('Error in get_hierarchy_children RPC:', error);
    return NextResponse.json(
      { error: 'Error al obtener hijos de la entidad' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: data ?? [],
    meta: {
      parentId: id,
      parentLevel,
      childLevel,
      count: data?.length ?? 0,
    },
  });
}
