import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyApiAuth } from '@/lib/auth/verify-api-auth';
import { getReportDefinition, isValidReportType } from '@/lib/reports/catalog';
import type { ReportFilters, ReportType } from '@/types/reports';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_NIVELES = [
  'provincia',
  'municipio',
  'circunscripcion',
  'sector',
];

/**
 * Maximum rows allowed for a single report query.
 * Beyond this threshold the frontend should use server-side generation.
 */
const MAX_REPORT_ROWS = 10_000;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateUUID(value: string | null | undefined, fieldName: string): string | null {
  if (!value) return null;
  if (!UUID_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} debe ser un UUID valido`);
  }
  return value;
}

function validateDate(value: string | null | undefined, fieldName: string): string | null {
  if (!value) return null;
  if (!ISO_DATE_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} debe tener formato YYYY-MM-DD`);
  }
  return value;
}

function validateNivel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!VALID_NIVELES.includes(value)) {
    throw new ValidationError(
      `nivel invalido. Valores permitidos: ${VALID_NIVELES.join(', ')}`
    );
  }
  return value;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates filter values based on the report definition's required filters.
 * Returns sanitized filter parameters for the RPC call.
 */
function validateAndSanitizeFilters(
  filters: ReportFilters,
  reportType: ReportType
): Record<string, string | null> {
  const definition = getReportDefinition(reportType);
  if (!definition) {
    throw new ValidationError(`Tipo de reporte no encontrado: ${reportType}`);
  }

  const sanitized: Record<string, string | null> = {};

  for (const filterField of definition.filters) {
    const rawValue = filters[filterField] ?? null;

    switch (filterField) {
      case 'provincia_id':
      case 'municipio_id':
      case 'circunscripcion_id':
      case 'sector_id':
      case 'comite_id':
      case 'periodo_id':
      case 'miembro_id':
      case 'usuario_id':
      case 'parent_id':
        sanitized[`p_${filterField}`] = validateUUID(
          rawValue as string | null,
          filterField
        );
        break;

      case 'date_from':
        sanitized.p_date_from = validateDate(
          rawValue as string | null,
          'date_from'
        );
        break;

      case 'date_to':
        sanitized.p_date_to = validateDate(
          rawValue as string | null,
          'date_to'
        );
        break;

      case 'nivel':
        sanitized.p_nivel = validateNivel(rawValue as string | null);
        break;

      case 'alliance_prefix': {
        const prefix = rawValue as string | null;
        // Sanitize: only allow alphanumeric characters for prefix matching
        if (prefix && !/^[a-zA-Z0-9]+$/.test(prefix)) {
          throw new ValidationError(
            'alliance_prefix solo puede contener caracteres alfanumericos'
          );
        }
        sanitized.p_alliance_prefix = prefix || null;
        break;
      }

      default:
        // Unknown filter fields are silently ignored
        break;
    }
  }

  return sanitized;
}

// ---------------------------------------------------------------------------
// POST /api/reports/generate
// ---------------------------------------------------------------------------
// Generates report data by calling the appropriate PostgreSQL RPC function.
//
// Request body:
//   {
//     "report_type": "members_by_coordinator",
//     "filters": {
//       "provincia_id": "...",
//       "municipio_id": "..."
//     }
//   }
//
// Response:
//   {
//     "data": [ ... rows ... ],
//     "meta": {
//       "report_type": "members_by_coordinator",
//       "row_count": 42,
//       "generated_at": "2026-04-10T12:00:00Z",
//       "filters_applied": { ... }
//     }
//   }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  // 1. Authentication
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) {
    return authResult.response;
  }

  // 2. Parse request body
  let body: { report_type?: string; filters?: ReportFilters };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido (JSON esperado)' },
      { status: 400 }
    );
  }

  // 3. Validate report_type
  const reportType = body.report_type;
  if (!reportType || !isValidReportType(reportType)) {
    return NextResponse.json(
      { error: `Tipo de reporte invalido: ${reportType ?? '(vacio)'}` },
      { status: 400 }
    );
  }

  const definition = getReportDefinition(reportType);
  if (!definition) {
    return NextResponse.json(
      { error: `Definicion de reporte no encontrada: ${reportType}` },
      { status: 400 }
    );
  }

  // 4. Validate required filters
  //    For electoral reports, periodo_id is typically required.
  const filters = body.filters ?? {};
  if (
    definition.filters.includes('periodo_id') &&
    reportType !== 'turnout_by_recinto' // turnout allows null periodo_id
  ) {
    if (!filters.periodo_id) {
      return NextResponse.json(
        { error: 'periodo_id es requerido para este tipo de reporte' },
        { status: 400 }
      );
    }
  }

  // For member_detail, miembro_id is required
  if (reportType === 'member_detail' && !filters.miembro_id) {
    return NextResponse.json(
      { error: 'miembro_id es requerido para el reporte de detalle de miembro' },
      { status: 400 }
    );
  }

  // For summary_by_geographic_level, nivel is required
  if (reportType === 'summary_by_geographic_level' && !filters.nivel) {
    return NextResponse.json(
      { error: 'nivel es requerido para el reporte de resumen geografico' },
      { status: 400 }
    );
  }

  // 5. Validate and sanitize filter values
  let rpcParams: Record<string, string | null>;
  try {
    rpcParams = validateAndSanitizeFilters(filters, reportType);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // 6. Execute the RPC
  const supabase = createClient();

  // Special handling for member_listing which uses search_members RPC
  if (reportType === 'member_listing') {
    return handleMemberListing(supabase, filters, reportType);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC functions not yet in generated types
    const { data, error } = await (supabase.rpc as any)(
      definition.rpcFunction,
      rpcParams
    );

    if (error) {
      console.error(
        `Error calling RPC ${definition.rpcFunction}:`,
        error
      );
      return NextResponse.json(
        { error: `Error al generar reporte: ${error.message}` },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : data ? [data] : [];

    // Enforce row limit
    if (rows.length > MAX_REPORT_ROWS) {
      return NextResponse.json(
        {
          error: `El reporte contiene ${rows.length} filas, que excede el limite de ${MAX_REPORT_ROWS}. Use la generacion del lado del servidor para reportes grandes.`,
          row_count: rows.length,
          suggest_server_side: true,
        },
        { status: 413 }
      );
    }

    return NextResponse.json({
      data: rows,
      meta: {
        report_type: reportType,
        row_count: rows.length,
        generated_at: new Date().toISOString(),
        filters_applied: filters,
      },
    });
  } catch (err) {
    console.error('Unexpected error in report generation:', err);
    return NextResponse.json(
      { error: 'Error interno al generar el reporte' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Special handler for member_listing report type
// ---------------------------------------------------------------------------
// The search_members function has a different parameter signature and
// includes pagination. For report generation, we request all results
// up to MAX_REPORT_ROWS.
// ---------------------------------------------------------------------------
async function handleMemberListing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  filters: ReportFilters,
  reportType: ReportType
) {
  try {
    const { data, error } = await supabase.rpc('search_members', {
      p_search: null,
      p_cedula: null,
      p_provincia_id: filters.provincia_id || null,
      p_municipio_id: filters.municipio_id || null,
      p_circunscripcion_id: filters.circunscripcion_id || null,
      p_sector_id: filters.sector_id || null,
      p_tipo_miembro: null,
      p_coordinador_id: null,
      p_estado: true,
      p_limit: MAX_REPORT_ROWS,
      p_offset: 0,
    });

    if (error) {
      console.error('Error calling search_members for report:', error);
      return NextResponse.json(
        { error: `Error al generar listado de miembros: ${error.message}` },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];

    // Strip total_count from rows (internal to search_members)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cleanedRows = rows.map(({ total_count, ...rest }: Record<string, unknown>) => rest);

    return NextResponse.json({
      data: cleanedRows,
      meta: {
        report_type: reportType,
        row_count: cleanedRows.length,
        generated_at: new Date().toISOString(),
        filters_applied: filters,
      },
    });
  } catch (err) {
    console.error('Unexpected error in member listing report:', err);
    return NextResponse.json(
      { error: 'Error interno al generar el listado de miembros' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/reports/generate
// ---------------------------------------------------------------------------
// Returns the report catalog -- list of all available report types with
// their metadata. Useful for the report builder to populate the type selector.
// ---------------------------------------------------------------------------
export async function GET() {
  const authResult = await verifyApiAuth({ includePartido: false });
  if (!authResult.authorized) {
    return authResult.response;
  }

  // Import catalog lazily to keep bundle small for non-report routes
  const { REPORT_CATALOG, REPORT_CATEGORIES } = await import(
    '@/lib/reports/catalog'
  );

  return NextResponse.json({
    data: {
      categories: REPORT_CATEGORIES,
      reports: REPORT_CATALOG,
    },
  });
}
