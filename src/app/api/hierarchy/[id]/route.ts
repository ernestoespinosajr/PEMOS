import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * UUID v4 validation regex.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Map of table names to their parent FK column and parent table.
 * Used for building the breadcrumb chain.
 */
const LEVEL_CONFIG = {
  provincias: { parentFk: null, parentTable: null, codeCol: 'codigo' },
  municipios: { parentFk: 'provincia_id', parentTable: 'provincias', codeCol: 'codigo' },
  circunscripciones: { parentFk: 'municipio_id', parentTable: 'municipios', codeCol: 'numero' },
  sectores: { parentFk: 'circunscripcion_id', parentTable: 'circunscripciones', codeCol: 'codigo' },
  comites: { parentFk: 'sector_id', parentTable: 'sectores', codeCol: 'codigo' },
  niveles_intermedios: { parentFk: 'comite_id', parentTable: 'comites', codeCol: 'codigo' },
} as const;

type TableName = keyof typeof LEVEL_CONFIG;

const TABLE_NAMES: TableName[] = [
  'provincias',
  'municipios',
  'circunscripciones',
  'sectores',
  'comites',
  'niveles_intermedios',
];

/**
 * Singular level names that map to table names.
 */
const LEVEL_TO_TABLE: Record<string, TableName> = {
  provincia: 'provincias',
  municipio: 'municipios',
  circunscripcion: 'circunscripciones',
  sector: 'sectores',
  comite: 'comites',
  nivel_intermedio: 'niveles_intermedios',
};

/**
 * Finds which table an entity belongs to by searching each table for the ID.
 * Returns the table name and the row data.
 */
async function findEntityById(
  supabase: ReturnType<typeof createClient>,
  entityId: string
): Promise<{ table: TableName; row: Record<string, unknown> } | null> {
  for (const table of TABLE_NAMES) {
    const config = LEVEL_CONFIG[table];
    const codeCol = config.codeCol;

    // Build select string based on table structure
    const selectCols =
      config.parentFk
        ? `id, nombre, ${codeCol}, estado, tenant_id, ${config.parentFk}`
        : `id, nombre, ${codeCol}, estado, tenant_id`;

    const { data, error } = await supabase
      .from(table)
      .select(selectCols)
      .eq('id', entityId)
      .single();

    if (!error && data) {
      return { table, row: data as Record<string, unknown> };
    }
  }
  return null;
}

/**
 * Builds the full breadcrumb chain from a given entity up to the root
 * provincia. Returns an array from root to the entity itself.
 */
async function buildBreadcrumbs(
  supabase: ReturnType<typeof createClient>,
  table: TableName,
  row: Record<string, unknown>
): Promise<Array<{ id: string; nombre: string; nivel: string }>> {
  const breadcrumbs: Array<{ id: string; nombre: string; nivel: string }> = [];

  let currentTable = table;
  let currentRow = row;

  // Walk up the hierarchy
  while (true) {
    // Convert plural table name to singular level name
    const nivel = currentTable.replace(/s$/, '').replace(/cione$/, 'cion');
    breadcrumbs.unshift({
      id: currentRow.id as string,
      nombre: currentRow.nombre as string,
      nivel,
    });

    const config = LEVEL_CONFIG[currentTable];
    if (!config.parentFk || !config.parentTable) {
      break; // Reached provincias (root)
    }

    const parentId = currentRow[config.parentFk] as string | null;
    if (!parentId) {
      break;
    }

    const parentTable = config.parentTable;
    const parentConfig = LEVEL_CONFIG[parentTable];
    const parentCodeCol = parentConfig.codeCol;
    const parentSelectCols =
      parentConfig.parentFk
        ? `id, nombre, ${parentCodeCol}, estado, tenant_id, ${parentConfig.parentFk}`
        : `id, nombre, ${parentCodeCol}, estado, tenant_id`;

    const { data: parentRow, error: parentError } = await supabase
      .from(parentTable)
      .select(parentSelectCols)
      .eq('id', parentId)
      .single();

    if (parentError || !parentRow) {
      break;
    }

    currentTable = parentTable;
    currentRow = parentRow as Record<string, unknown>;
  }

  return breadcrumbs;
}

/**
 * Verifies the requesting user has admin role.
 * Returns the user's tenant_id if authorized, or a NextResponse error.
 */
async function verifyAdmin(): Promise<
  | { authorized: true; tenantId: string | null }
  | { authorized: false; response: NextResponse }
> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      ),
    };
  }

  const { data: dbUser, error: dbError } = await supabase
    .from('usuarios')
    .select('role, tenant_id')
    .eq('auth_user_id', user.id)
    .single();

  if (dbError || !dbUser || dbUser.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, tenantId: dbUser.tenant_id };
}

/**
 * GET /api/hierarchy/[id]
 *
 * Returns the details of a single geographic entity, including:
 *   - Entity data (id, nombre, codigo, estado)
 *   - The entity's nivel (which table/level it belongs to)
 *   - Full breadcrumb chain from root (provincia) to the entity
 *
 * Requires authentication (any role).
 *
 * Response:
 *   {
 *     data: {
 *       id, nombre, codigo, estado, nivel,
 *       breadcrumbs: [{ id, nombre, nivel }, ...]
 *     }
 *   }
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

  const entity = await findEntityById(supabase, id);

  if (!entity) {
    return NextResponse.json(
      { error: 'Entidad no encontrada' },
      { status: 404 }
    );
  }

  const { table, row } = entity;
  const config = LEVEL_CONFIG[table];

  // Build breadcrumbs
  const breadcrumbs = await buildBreadcrumbs(supabase, table, row);

  // Determine the singular level name
  const nivel = table.replace(/s$/, '').replace(/cione$/, 'cion');

  return NextResponse.json({
    data: {
      id: row.id,
      nombre: row.nombre,
      codigo: row[config.codeCol],
      estado: row.estado,
      nivel,
      breadcrumbs,
    },
  });
}

/**
 * PATCH /api/hierarchy/[id]
 *
 * Updates a geographic entity. Only the `nombre` and `estado` fields can
 * be modified (codigo/numero are JCE-assigned identifiers and should not
 * change through the API).
 *
 * Requires admin role.
 *
 * Request body:
 *   { nombre?: string, estado?: boolean }
 *
 * Response:
 *   { data: { id, nombre, codigo, estado } }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'ID debe ser un UUID valido' },
      { status: 400 }
    );
  }

  let body: { nombre?: string; estado?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido' },
      { status: 400 }
    );
  }

  const { nombre, estado } = body;

  // Validate at least one field is provided
  if (nombre === undefined && estado === undefined) {
    return NextResponse.json(
      { error: 'Se requiere al menos un campo para actualizar: nombre, estado' },
      { status: 400 }
    );
  }

  // Validate field types
  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return NextResponse.json(
      { error: 'El nombre debe ser una cadena no vacia' },
      { status: 400 }
    );
  }

  if (nombre !== undefined && nombre.trim().length > 100) {
    return NextResponse.json(
      { error: 'El nombre no debe exceder 100 caracteres' },
      { status: 400 }
    );
  }

  if (estado !== undefined && typeof estado !== 'boolean') {
    return NextResponse.json(
      { error: 'El estado debe ser un valor booleano' },
      { status: 400 }
    );
  }

  // Find the entity to determine its table
  const supabase = createClient();
  const entity = await findEntityById(supabase, id);

  if (!entity) {
    return NextResponse.json(
      { error: 'Entidad no encontrada' },
      { status: 404 }
    );
  }

  const { table } = entity;

  // Build update payload
  const updatePayload: Record<string, unknown> = {};
  if (nombre !== undefined) updatePayload.nombre = nombre.trim();
  if (estado !== undefined) updatePayload.estado = estado;

  // Use admin client to bypass RLS for the update
  const adminClient = createAdminClient();

  const { data: updated, error: updateError } = await adminClient
    .from(table)
    .update(updatePayload)
    .eq('id', id)
    .select('id, nombre, estado')
    .single();

  if (updateError) {
    console.error(`Error updating ${table}:`, updateError);
    return NextResponse.json(
      { error: 'Error al actualizar la entidad' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/hierarchy/[id]
 *
 * Soft-deletes a geographic entity by setting estado = false.
 * Hard deletion is not supported because geographic entities may have
 * children or members referencing them (ON DELETE RESTRICT).
 *
 * Requires admin role.
 *
 * Response:
 *   { data: { id, nombre, estado: false }, message: '...' }
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdmin();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'ID debe ser un UUID valido' },
      { status: 400 }
    );
  }

  // Find the entity to determine its table
  const supabase = createClient();
  const entity = await findEntityById(supabase, id);

  if (!entity) {
    return NextResponse.json(
      { error: 'Entidad no encontrada' },
      { status: 404 }
    );
  }

  const { table } = entity;

  // Soft delete: set estado = false
  const adminClient = createAdminClient();

  const { data: updated, error: updateError } = await adminClient
    .from(table)
    .update({ estado: false })
    .eq('id', id)
    .select('id, nombre, estado')
    .single();

  if (updateError) {
    console.error(`Error soft-deleting ${table}:`, updateError);
    return NextResponse.json(
      { error: 'Error al desactivar la entidad' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: updated,
    message: 'Entidad desactivada exitosamente',
  });
}
