import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Valid geographic hierarchy levels in the Dominican Republic political
 * structure. These map directly to database table names.
 */
const VALID_LEVELS = [
  'provincia',
  'municipio',
  'circunscripcion',
  'sector',
  'comite',
  'nivel_intermedio',
] as const;

type HierarchyLevel = (typeof VALID_LEVELS)[number];

/**
 * UUID v4 validation regex.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/hierarchy
 *
 * Unified hierarchy endpoint that supports two modes:
 *
 * 1. **Browse mode**: List entities at a given level, optionally filtered
 *    by parent. Uses the `get_hierarchy_children` RPC function which joins
 *    materialized views for member counts.
 *
 *    Query params:
 *      - level (required): One of the VALID_LEVELS
 *      - parentId (optional): UUID of the parent entity to filter by
 *
 *    Example:
 *      GET /api/hierarchy?level=provincia
 *      GET /api/hierarchy?level=municipio&parentId=<provincia_uuid>
 *
 * 2. **Search mode**: Cross-level search by name or code.
 *    Uses the `search_hierarchy` RPC function.
 *
 *    Query params:
 *      - search (required): Search term (min 2 characters)
 *
 *    Example:
 *      GET /api/hierarchy?search=santo+domingo
 *
 * Requires authentication (any role).
 *
 * Response format (browse):
 *   {
 *     data: [
 *       {
 *         id, nombre, codigo, estado,
 *         total_miembros, coordinadores, multiplicadores, relacionados
 *       }
 *     ],
 *     meta: { level, parentId, count }
 *   }
 *
 * Response format (search):
 *   {
 *     data: [
 *       { id, nombre, codigo, nivel, parent_nombre }
 *     ],
 *     meta: { search, count }
 *   }
 */
export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const level = searchParams.get('level') as HierarchyLevel | null;
  const parentId = searchParams.get('parentId');

  // -- Search mode -----------------------------------------------------------
  if (search) {
    const trimmed = search.trim();

    if (trimmed.length < 2) {
      return NextResponse.json(
        { error: 'El termino de busqueda debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    // Cap length to prevent abuse
    if (trimmed.length > 100) {
      return NextResponse.json(
        { error: 'El termino de busqueda no debe exceder 100 caracteres' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('search_hierarchy', {
      search_term: trimmed,
    });

    if (error) {
      console.error('Error in search_hierarchy RPC:', error);
      return NextResponse.json(
        { error: 'Error al buscar en la jerarquia' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data ?? [],
      meta: {
        search: trimmed,
        count: data?.length ?? 0,
      },
    });
  }

  // -- Browse mode -----------------------------------------------------------
  if (!level) {
    return NextResponse.json(
      {
        error:
          'Se requiere el parametro "level" o "search". Niveles validos: ' +
          VALID_LEVELS.join(', '),
      },
      { status: 400 }
    );
  }

  if (!VALID_LEVELS.includes(level)) {
    return NextResponse.json(
      {
        error: `Nivel invalido: "${level}". Debe ser uno de: ${VALID_LEVELS.join(', ')}`,
      },
      { status: 400 }
    );
  }

  // Validate parentId format if provided
  if (parentId && !UUID_REGEX.test(parentId)) {
    return NextResponse.json(
      { error: 'parentId debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('get_hierarchy_children', {
    target_level: level,
    parent_id: parentId ?? null,
  });

  if (error) {
    console.error('Error in get_hierarchy_children RPC:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de jerarquia' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: data ?? [],
    meta: {
      level,
      parentId: parentId ?? null,
      count: data?.length ?? 0,
    },
  });
}
