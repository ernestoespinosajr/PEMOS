import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = 'member-photos';

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
// POST /api/members/[id]/photo
// ---------------------------------------------------------------------------
// Upload member photo to Supabase Storage.
// Accepts multipart form data with a single file field named "photo".
// Validates file type (JPEG, PNG) and size (max 5MB).
// Stores in member-photos/{tenant_id}/{member_id}.jpg
// Updates foto_url in miembros table.
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
      { error: 'No autorizado. Rol de observador no puede subir fotos.' },
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

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Se esperaba multipart/form-data con un campo "photo"' },
      { status: 400 }
    );
  }

  const file = formData.get('photo');

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Se requiere un archivo en el campo "photo"' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de archivo no permitido. Solo se aceptan JPEG y PNG.' },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'El archivo excede el tamano maximo de 5MB' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Verify member exists
  const { data: member, error: memberError } = await supabase
    .from('miembros')
    .select('id, tenant_id')
    .eq('id', id)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json(
      { error: 'Miembro no encontrado' },
      { status: 404 }
    );
  }

  // Determine file extension
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const tenantFolder = authResult.tenantId ?? 'default';
  const filePath = `${tenantFolder}/${id}.${ext}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = new Uint8Array(arrayBuffer);

  // Upload to Supabase Storage (upsert to overwrite existing photo)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading photo:', uploadError);
    return NextResponse.json(
      { error: 'Error al subir la foto. Verifique que el bucket "member-photos" exista.' },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // Update foto_url in miembros table
  const { error: updateError } = await supabase
    .from('miembros')
    .update({ foto_url: publicUrl })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating foto_url:', updateError);
    return NextResponse.json(
      { error: 'Foto subida pero no se pudo actualizar el registro del miembro' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      foto_url: publicUrl,
      file_path: filePath,
    },
  });
}
