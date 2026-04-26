import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateSeguimientoPayload, SeguimientoTipo } from '@/types/member';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_TIPOS: SeguimientoTipo[] = [
  'llamada', 'visita', 'mensaje', 'reunion', 'otro',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyAuth(): Promise<
  | { authorized: true; tenantId: string | null; usuarioId: string; role: string }
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
    .select('id, role, tenant_id')
    .eq('auth_user_id', user.id)
    .single();

  if (dbError || !dbUser) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Usuario no encontrado en el sistema' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    tenantId: dbUser.tenant_id,
    usuarioId: dbUser.id,
    role: dbUser.role,
  };
}

// ---------------------------------------------------------------------------
// GET /api/members/[id]/seguimiento
// ---------------------------------------------------------------------------
// List follow-up entries for a member, ordered by date DESC.
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'ID de miembro invalido' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Verify member exists
  const { data: member, error: memberError } = await supabase
    .from('miembros')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json(
      { error: 'Miembro no encontrado' },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from('seguimiento_miembros')
    .select(`
      *,
      usuarios ( nombre, apellido )
    `)
    .eq('miembro_id', id)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching seguimiento:', error);
    return NextResponse.json(
      { error: 'Error al obtener seguimiento' },
      { status: 500 }
    );
  }

  // Flatten usuario name
  const entries = (data ?? []).map((entry) => {
    const usuario = entry.usuarios as { nombre: string; apellido: string } | null;
    return {
      ...entry,
      usuarios: undefined,
      usuario_nombre: usuario
        ? `${usuario.nombre} ${usuario.apellido}`
        : null,
    };
  });

  return NextResponse.json({ data: entries });
}

// ---------------------------------------------------------------------------
// POST /api/members/[id]/seguimiento
// ---------------------------------------------------------------------------
// Add a new follow-up entry for a member.
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }

  if (authResult.role === 'observer') {
    return NextResponse.json(
      { error: 'No autorizado. Rol de observador no puede agregar seguimiento.' },
      { status: 403 }
    );
  }

  const { id } = params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: 'ID de miembro invalido' },
      { status: 400 }
    );
  }

  let body: CreateSeguimientoPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud invalido' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.notas || !body.tipo) {
    return NextResponse.json(
      { error: 'Campos requeridos: tipo, notas' },
      { status: 400 }
    );
  }

  if (!VALID_TIPOS.includes(body.tipo)) {
    return NextResponse.json(
      { error: `Tipo invalido. Debe ser uno de: ${VALID_TIPOS.join(', ')}` },
      { status: 400 }
    );
  }

  if (body.notas.trim().length === 0) {
    return NextResponse.json(
      { error: 'Las notas no pueden estar vacias' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Verify member exists
  const { data: member, error: memberError } = await supabase
    .from('miembros')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json(
      { error: 'Miembro no encontrado' },
      { status: 404 }
    );
  }

  const insertData: Record<string, unknown> = {
    miembro_id: id,
    usuario_id: authResult.usuarioId,
    tipo: body.tipo,
    notas: body.notas.trim(),
    tenant_id: authResult.tenantId,
  };

  if (body.resultado) insertData.resultado = body.resultado.trim();
  if (body.fecha) insertData.fecha = body.fecha;

  const { data: newEntry, error } = await supabase
    .from('seguimiento_miembros')
    // Supabase generated types reject Record<string, unknown> for dynamic insert payload — cast to never
    .insert(insertData as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating seguimiento:', error);
    return NextResponse.json(
      { error: 'Error al crear entrada de seguimiento' },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: newEntry }, { status: 201 });
}
