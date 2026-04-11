import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/geography
 *
 * Fetches geographic data for the cascading scope selector.
 *
 * Query params:
 *   - type: 'provincias' | 'municipios' | 'circunscripciones'
 *   - provincia_id: (optional) Filter municipios by provincia
 *   - municipio_id: (optional) Filter circunscripciones by municipio
 *
 * Requires authentication (any role can fetch geography data).
 */
export async function GET(request: Request) {
  const supabase = createClient();

  // Verify authentication
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
  const type = searchParams.get('type');

  if (!type || !['provincias', 'municipios', 'circunscripciones'].includes(type)) {
    return NextResponse.json(
      { error: 'Parametro type invalido. Debe ser: provincias, municipios, o circunscripciones' },
      { status: 400 }
    );
  }

  if (type === 'provincias') {
    const { data, error } = await supabase
      .from('provincias')
      .select('id, nombre, codigo')
      .eq('estado', true)
      .order('nombre');

    if (error) {
      console.error('Error fetching provincias:', error);
      return NextResponse.json(
        { error: 'Error al obtener provincias' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  }

  if (type === 'municipios') {
    const provinciaId = searchParams.get('provincia_id');
    if (!provinciaId) {
      return NextResponse.json(
        { error: 'Se requiere provincia_id para obtener municipios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('municipios')
      .select('id, nombre, codigo')
      .eq('provincia_id', provinciaId)
      .eq('estado', true)
      .order('nombre');

    if (error) {
      console.error('Error fetching municipios:', error);
      return NextResponse.json(
        { error: 'Error al obtener municipios' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  }

  if (type === 'circunscripciones') {
    const municipioId = searchParams.get('municipio_id');
    if (!municipioId) {
      return NextResponse.json(
        { error: 'Se requiere municipio_id para obtener circunscripciones' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('circunscripciones')
      .select('id, nombre')
      .eq('municipio_id', municipioId)
      .eq('estado', true)
      .order('nombre');

    if (error) {
      console.error('Error fetching circunscripciones:', error);
      return NextResponse.json(
        { error: 'Error al obtener circunscripciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  }

  return NextResponse.json({ data: [] });
}
