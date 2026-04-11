import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import { isValidReportType } from '@/lib/reports/catalog';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Note: report_archives table was created in migration 20260410000004 but
// is not yet reflected in the generated Supabase types (types/supabase.ts).
// Until types are regenerated after applying the migration, we use type
// assertions for the query builder. This is consistent with the pattern
// used in other routes (e.g., electoral/dashboard/summary).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET /api/reports/archives
// ---------------------------------------------------------------------------
// Lists archived reports for the authenticated user's tenant.
// Supports pagination and optional filtering by report_type.
//
// Query params:
//   - page (default: 1)
//   - page_size (default: 25, max: 100)
//   - report_type (optional): filter by report type
//   - sort_by (optional): 'generated_at' (default), 'report_name', 'file_size_bytes'
//   - sort_order (optional): 'desc' (default), 'asc'
//
// Response:
//   {
//     "data": [ ...ReportArchive rows... ],
//     "meta": { "total", "page", "page_size", "total_pages", "has_next", "has_previous" }
//   }
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);

  // Parse pagination
  const page = Math.max(
    parseInt(searchParams.get('page') || `${DEFAULT_PAGE}`, 10),
    1
  );
  const page_size = Math.min(
    Math.max(
      parseInt(searchParams.get('page_size') || `${DEFAULT_PAGE_SIZE}`, 10),
      1
    ),
    MAX_PAGE_SIZE
  );

  // Parse filters
  const report_type = searchParams.get('report_type') || null;

  // Parse sorting
  const validSortFields = ['generated_at', 'report_name', 'file_size_bytes'];
  const sort_by = validSortFields.includes(
    searchParams.get('sort_by') || ''
  )
    ? searchParams.get('sort_by')!
    : 'generated_at';
  const sort_ascending = searchParams.get('sort_order') === 'asc';

  // Validate report_type filter
  if (report_type && !isValidReportType(report_type)) {
    return NextResponse.json(
      { error: `Tipo de reporte invalido: ${report_type}` },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Build query -- use type assertion because report_archives is not yet
  // in the generated Supabase types (pending type regeneration after migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromTable = (supabase as any).from('report_archives');
  let query = fromTable
    .select('*', { count: 'exact' })
    .eq('estado', true)
    .order(sort_by, { ascending: sort_ascending });

  // Apply report_type filter
  if (report_type) {
    query = query.eq('report_type', report_type);
  }

  // Apply pagination
  const offset = (page - 1) * page_size;
  query = query.range(offset, offset + page_size - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing report archives:', error);
    return NextResponse.json(
      { error: 'Error al listar reportes archivados' },
      { status: 500 }
    );
  }

  const total = (count as number | null) ?? 0;
  const total_pages = Math.ceil(total / page_size);

  return NextResponse.json({
    data: data ?? [],
    meta: {
      total,
      page,
      page_size,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/reports/archives
// ---------------------------------------------------------------------------
// Creates a new archive entry after a PDF has been uploaded to Storage.
//
// Request body:
//   {
//     "report_type": "members_by_coordinator",
//     "report_name": "Miembros por Coordinador - Distrito Nacional",
//     "filters_applied": { "provincia_id": "..." },
//     "file_path": "reports/{tenant_id}/2026/04/members_by_coordinator_1712764800.pdf",
//     "file_size_bytes": 45230
//   }
//
// Response: { data: ReportArchive }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) {
    return authResult.response;
  }

  let body: {
    report_type?: string;
    report_name?: string;
    filters_applied?: Record<string, unknown>;
    file_path?: string;
    file_size_bytes?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido (JSON esperado)' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.report_type || !body.report_name || !body.file_path) {
    return NextResponse.json(
      {
        error:
          'Campos requeridos: report_type, report_name, file_path',
      },
      { status: 400 }
    );
  }

  // Validate report_type
  if (!isValidReportType(body.report_type)) {
    return NextResponse.json(
      { error: `Tipo de reporte invalido: ${body.report_type}` },
      { status: 400 }
    );
  }

  // Validate report_name length
  if (body.report_name.length > 500) {
    return NextResponse.json(
      { error: 'report_name no puede exceder 500 caracteres' },
      { status: 400 }
    );
  }

  // Validate file_path length and format (must not contain ..)
  if (body.file_path.length > 1000 || body.file_path.includes('..')) {
    return NextResponse.json(
      { error: 'file_path invalido' },
      { status: 400 }
    );
  }

  // Validate file_size_bytes
  const fileSizeBytes =
    typeof body.file_size_bytes === 'number' && body.file_size_bytes >= 0
      ? body.file_size_bytes
      : 0;

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('report_archives')
    .insert({
      tenant_id: authResult.tenantId,
      report_type: body.report_type,
      report_name: body.report_name.trim(),
      filters_applied: body.filters_applied ?? {},
      generated_by: authResult.authUserId,
      file_path: body.file_path.trim(),
      file_size_bytes: fileSizeBytes,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating report archive:', error);
    return NextResponse.json(
      { error: 'Error al archivar reporte' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/reports/archives?id=<uuid>
// ---------------------------------------------------------------------------
// Deletes an archived report. Admin only.
// Removes the file from Supabase Storage and the metadata row.
//
// Query params:
//   - id (required): UUID of the archive entry
//
// Response: { data: { deleted: true } }
// ---------------------------------------------------------------------------
export async function DELETE(request: Request) {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) {
    return authResult.response;
  }

  // Only admin can delete archived reports
  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo administradores pueden eliminar reportes archivados' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'id es requerido y debe ser un UUID valido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Get the archive entry first to find the file path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: archive, error: fetchError } = await (supabase as any)
    .from('report_archives')
    .select('id, file_path')
    .eq('id', id)
    .eq('estado', true)
    .single();

  if (fetchError || !archive) {
    return NextResponse.json(
      { error: 'Reporte archivado no encontrado' },
      { status: 404 }
    );
  }

  // Delete the file from Storage (best effort -- do not fail if file is missing)
  const filePath = (archive as Record<string, unknown>).file_path as
    | string
    | null;
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from('reports')
      .remove([filePath]);

    if (storageError) {
      console.warn(
        `Warning: Could not delete storage file ${filePath}:`,
        storageError
      );
      // Continue with delete even if file removal fails
    }
  }

  // Delete the archive entry (RLS policy restricts to admin + same tenant)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from('report_archives')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting report archive:', deleteError);
    return NextResponse.json(
      { error: 'Error al eliminar reporte archivado' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true } });
}
