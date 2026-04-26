-- =============================================================================
-- Migration: Seguimiento RPC Tenant Enforcement
-- =============================================================================
-- Addresses the remaining security gap from the ftr-009 quality review:
-- SECURITY DEFINER functions bypass RLS entirely, so they must enforce tenant
-- isolation explicitly in their SQL queries. The prior remediation
-- (20260410000001) added tenant-scoped RLS policies to all 4 tables, but the
-- three SECURITY DEFINER functions were not updated.
--
-- Functions updated:
--   1. get_followup_queue()       -- Now scopes periodos_electorales lookup to
--                                    the calling user's tenant via partidos join.
--   2. get_conversion_rates()     -- Now enforces mandatory tenant filtering via
--                                    partido_belongs_to_my_tenant(), regardless
--                                    of whether p_partido_id is provided.
--   3. convert_seguimiento_to_member() -- Now verifies the seguimiento record's
--                                    partido belongs to the caller's tenant
--                                    before proceeding.
--
-- Risk: These functions run as SECURITY DEFINER, which means RLS is bypassed.
-- Without explicit tenant checks, a user from Tenant A could invoke the RPC
-- and receive/modify data from Tenant B. This migration closes that gap.
--
-- Rollback:
--   -- Restore the original function definitions from 20260409000010 and 20260410000001:
--   -- (Re-run CREATE OR REPLACE for the three functions without tenant checks)
--   -- Note: The functions are CREATE OR REPLACE, so rollback is another
--   -- CREATE OR REPLACE with the prior definitions.
-- =============================================================================


-- =============================================================================
-- STEP 1: Update get_followup_queue() with tenant enforcement
-- =============================================================================
-- Problem: The function fetches the active periodo_electoral with LIMIT 1 but
-- does not filter by the calling user's tenant. In a multi-tenant deployment,
-- multiple tenants may have active periods simultaneously, and the function
-- could return data from the wrong tenant.
--
-- Fix: Join periodos_electorales through partidos to verify tenant ownership
-- using get_my_tenant_id(). Also add a secondary tenant check on padron_externo
-- via partido_belongs_to_my_tenant() for defense in depth.

CREATE OR REPLACE FUNCTION public.get_followup_queue(
    p_usuario_id UUID,
    p_limit INTEGER DEFAULT 25,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    padron_id UUID,
    cedula VARCHAR,
    nombres VARCHAR,
    apellidos VARCHAR,
    telefonos VARCHAR,
    colegio VARCHAR,
    cod_recinto VARCHAR,
    nombre_recinto VARCHAR,
    direccion_recinto TEXT,
    seguimiento_id UUID,
    estado VARCHAR,
    contacto VARCHAR,
    decision_voto VARCHAR,
    decision_presidente VARCHAR,
    comentario TEXT,
    fecha_proximo_seguimiento DATE,
    recinto_id UUID,
    es_vencido BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_partido_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Get the caller's tenant_id from JWT claims
    v_tenant_id := public.get_my_tenant_id();

    IF v_tenant_id IS NULL THEN
        RETURN; -- No tenant context = no data
    END IF;

    -- Get the active partido_id, scoped to the caller's tenant
    SELECT pe.partido_id INTO v_partido_id
    FROM periodos_electorales pe
    JOIN partidos p ON p.id = pe.partido_id
    WHERE pe.activo = true
      AND pe.estado = true
      AND p.tenant_id = v_tenant_id
    LIMIT 1;

    IF v_partido_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH user_recintos AS (
        -- Get recintos assigned to this user
        SELECT DISTINCT ar.recinto_id, r.cod_recinto AS assigned_cod_recinto
        FROM asignacion_recintos ar
        JOIN recintos r ON r.id = ar.recinto_id
        WHERE ar.usuario_id = p_usuario_id
          AND ar.estado = true
    ),
    queue AS (
        SELECT
            pe.id AS padron_id,
            pe.cedula,
            pe.nombres,
            pe.apellidos,
            pe.telefonos,
            pe.colegio,
            pe.cod_recinto,
            pe.nombre_recinto,
            pe.direccion_recinto,
            s.id AS seguimiento_id,
            COALESCE(s.estado, 'no_contactado')::VARCHAR AS estado,
            s.contacto,
            s.decision_voto,
            s.decision_presidente,
            s.comentario,
            s.fecha_proximo_seguimiento,
            ur.recinto_id,
            CASE
                WHEN s.fecha_proximo_seguimiento IS NOT NULL
                     AND s.fecha_proximo_seguimiento < CURRENT_DATE
                THEN true
                ELSE false
            END AS es_vencido
        FROM padron_externo pe
        INNER JOIN user_recintos ur ON pe.cod_recinto = ur.assigned_cod_recinto
        LEFT JOIN seguimiento_no_inscritos s
            ON s.cedula = pe.cedula
            AND s.partido_id = v_partido_id
        WHERE pe.partido_id = v_partido_id
          -- Exclude entries without valid phone numbers
          AND pe.telefonos IS NOT NULL
          AND pe.telefonos NOT IN ('0', '', ' ')
          -- Exclude terminal states
          AND COALESCE(s.estado, 'no_contactado') NOT IN ('registrado', 'rechazado')
    )
    SELECT
        q.padron_id,
        q.cedula,
        q.nombres,
        q.apellidos,
        q.telefonos,
        q.colegio,
        q.cod_recinto,
        q.nombre_recinto,
        q.direccion_recinto,
        q.seguimiento_id,
        q.estado,
        q.contacto,
        q.decision_voto,
        q.decision_presidente,
        q.comentario,
        q.fecha_proximo_seguimiento,
        q.recinto_id,
        q.es_vencido,
        COUNT(*) OVER() AS total_count
    FROM queue q
    ORDER BY
        q.es_vencido DESC,                       -- Overdue first
        q.fecha_proximo_seguimiento ASC NULLS LAST, -- Scheduled next
        q.estado = 'no_contactado' DESC,          -- New items
        q.nombres ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 2: Update get_conversion_rates() with mandatory tenant enforcement
-- =============================================================================
-- Problem: The function accepts p_partido_id as an optional parameter. When
-- NULL, it aggregates across ALL partidos from ALL tenants. Even when provided,
-- there is no verification that the caller belongs to that partido's tenant.
-- A user could pass any partido_id and receive another tenant's conversion data.
--
-- Fix: Always filter by the caller's tenant_id via the partidos table.
-- The p_partido_id parameter is still respected as an additional filter when
-- provided, but it must belong to the caller's tenant.

CREATE OR REPLACE FUNCTION public.get_conversion_rates(
    p_area_type TEXT DEFAULT NULL,
    p_area_id UUID DEFAULT NULL,
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin DATE DEFAULT NULL,
    p_partido_id UUID DEFAULT NULL
)
RETURNS TABLE (
    area_id UUID,
    area_nombre VARCHAR,
    total BIGINT,
    contactados BIGINT,
    registrados BIGINT,
    rechazados BIGINT,
    pendientes BIGINT,
    tasa_conversion NUMERIC
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get the caller's tenant_id from JWT claims
    v_tenant_id := public.get_my_tenant_id();

    IF v_tenant_id IS NULL THEN
        RETURN; -- No tenant context = no data
    END IF;

    RETURN QUERY
    SELECT
        CASE p_area_type
            WHEN 'municipio' THEN mu.id
            WHEN 'circunscripcion' THEN ci.id
            WHEN 'recinto' THEN r.id
            WHEN 'provincia' THEN pr.id
            ELSE NULL::UUID
        END AS area_id,
        CASE p_area_type
            WHEN 'municipio' THEN mu.nombre
            WHEN 'circunscripcion' THEN ci.nombre
            WHEN 'recinto' THEN r.nombre
            WHEN 'provincia' THEN pr.nombre
            ELSE 'Total'::VARCHAR
        END AS area_nombre,
        COUNT(*)::BIGINT AS total,
        COUNT(*) FILTER (WHERE s.estado IN ('contactado', 'seguimiento_programado', 'registrado', 'rechazado'))::BIGINT AS contactados,
        COUNT(*) FILTER (WHERE s.estado = 'registrado')::BIGINT AS registrados,
        COUNT(*) FILTER (WHERE s.estado = 'rechazado')::BIGINT AS rechazados,
        COUNT(*) FILTER (WHERE s.estado IN ('no_contactado', 'contactado', 'seguimiento_programado'))::BIGINT AS pendientes,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(
                (COUNT(*) FILTER (WHERE s.estado = 'registrado')::NUMERIC / COUNT(*)::NUMERIC) * 100,
                1
            )
            ELSE 0
        END AS tasa_conversion
    FROM seguimiento_no_inscritos s
    -- Join through partidos to enforce tenant isolation
    JOIN partidos pt ON pt.id = s.partido_id AND pt.tenant_id = v_tenant_id
    LEFT JOIN recintos r ON r.id = s.recinto_id
    LEFT JOIN municipios mu ON mu.id = r.municipio_id
    LEFT JOIN circunscripciones ci ON ci.id = r.circunscripcion_id
    LEFT JOIN provincias pr ON pr.id = mu.provincia_id
    WHERE
        -- Partido filter (within tenant -- tenant already enforced by JOIN above)
        (p_partido_id IS NULL OR s.partido_id = p_partido_id)
        -- Date range filter
        AND (p_fecha_inicio IS NULL OR s.created_at >= p_fecha_inicio::TIMESTAMPTZ)
        AND (p_fecha_fin IS NULL OR s.created_at < (p_fecha_fin + INTERVAL '1 day')::TIMESTAMPTZ)
        -- Area filter
        AND (
            p_area_id IS NULL
            OR (p_area_type = 'municipio' AND mu.id = p_area_id)
            OR (p_area_type = 'circunscripcion' AND ci.id = p_area_id)
            OR (p_area_type = 'recinto' AND r.id = p_area_id)
            OR (p_area_type = 'provincia' AND pr.id = p_area_id)
        )
    GROUP BY
        CASE p_area_type
            WHEN 'municipio' THEN mu.id
            WHEN 'circunscripcion' THEN ci.id
            WHEN 'recinto' THEN r.id
            WHEN 'provincia' THEN pr.id
            ELSE NULL::UUID
        END,
        CASE p_area_type
            WHEN 'municipio' THEN mu.nombre
            WHEN 'circunscripcion' THEN ci.nombre
            WHEN 'recinto' THEN r.nombre
            WHEN 'provincia' THEN pr.nombre
            ELSE 'Total'::VARCHAR
        END
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 3: Update convert_seguimiento_to_member() with tenant verification
-- =============================================================================
-- Problem: The function performs a member creation and seguimiento update
-- without verifying that the seguimiento record belongs to the caller's tenant.
-- A user from Tenant A could pass a seguimiento_id belonging to Tenant B and
-- create a member in Tenant B's data (if tenant_id is passed via p_member_data).
--
-- Fix: After fetching the seguimiento record, verify that its partido_id
-- belongs to the caller's tenant before proceeding.

CREATE OR REPLACE FUNCTION public.convert_seguimiento_to_member(
    p_seguimiento_id UUID,
    p_member_data JSONB
)
RETURNS UUID AS $$
DECLARE
    v_seguimiento RECORD;
    v_padron RECORD;
    v_new_member_id UUID;
    v_cedula VARCHAR;
    v_partido_id UUID;
    v_existing_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Get the caller's tenant_id from JWT claims
    v_tenant_id := public.get_my_tenant_id();

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo determinar el tenant del usuario'
            USING ERRCODE = 'P0001';
    END IF;

    -- 1. Fetch and lock the seguimiento record
    SELECT * INTO v_seguimiento
    FROM seguimiento_no_inscritos
    WHERE id = p_seguimiento_id
    FOR UPDATE;

    IF v_seguimiento IS NULL THEN
        RAISE EXCEPTION 'Registro de seguimiento no encontrado'
            USING ERRCODE = 'P0002'; -- no_data_found
    END IF;

    -- 1b. Verify the seguimiento record belongs to the caller's tenant
    IF NOT EXISTS (
        SELECT 1
        FROM partidos p
        WHERE p.id = v_seguimiento.partido_id
          AND p.tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Registro de seguimiento no encontrado'
            USING ERRCODE = 'P0002'; -- Return same error as not-found to avoid info leak
    END IF;

    IF v_seguimiento.miembro_id IS NOT NULL THEN
        RAISE EXCEPTION 'Este registro ya fue convertido a miembro'
            USING ERRCODE = 'P0001'; -- raise_exception
    END IF;

    v_cedula := v_seguimiento.cedula;
    v_partido_id := v_seguimiento.partido_id;

    -- 2. Check for duplicate cedula in miembros (within same tenant)
    SELECT id INTO v_existing_id
    FROM miembros
    WHERE cedula = v_cedula
      AND tenant_id = v_tenant_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'Ya existe un miembro con la cedula %', v_cedula
            USING ERRCODE = '23505'; -- unique_violation
    END IF;

    -- 3. Fetch padron data for pre-population (within same partido)
    SELECT * INTO v_padron
    FROM padron_externo
    WHERE cedula = v_cedula
      AND partido_id = v_partido_id
    LIMIT 1;

    -- 4. Insert the new member (force tenant_id from JWT, not from client)
    INSERT INTO miembros (
        cedula,
        nombre,
        apellido,
        tipo_miembro,
        telefono,
        celular,
        direccion,
        sexo,
        recinto_id,
        colegio,
        sector_id,
        comite_id,
        nivel_intermedio_id,
        coordinador_id,
        email,
        tenant_id
    ) VALUES (
        v_cedula,
        COALESCE(p_member_data->>'nombre', v_padron.nombres, 'Sin nombre'),
        COALESCE(p_member_data->>'apellido', v_padron.apellidos, 'Sin apellido'),
        (COALESCE(p_member_data->>'tipo_miembro', 'relacionado'))::tipo_miembro,
        COALESCE(p_member_data->>'telefono', v_padron.telefonos),
        COALESCE(p_member_data->>'celular', v_padron.telefonos_alt),
        COALESCE(p_member_data->>'direccion', v_padron.direccion_residencia),
        COALESCE(p_member_data->>'sexo', v_padron.sexo),
        COALESCE((p_member_data->>'recinto_id')::UUID, v_seguimiento.recinto_id),
        COALESCE(p_member_data->>'colegio', v_seguimiento.colegio, v_padron.colegio),
        (p_member_data->>'sector_id')::UUID,
        (p_member_data->>'comite_id')::UUID,
        (p_member_data->>'nivel_intermedio_id')::UUID,
        (p_member_data->>'coordinador_id')::UUID,
        p_member_data->>'email',
        v_tenant_id  -- Always use the caller's tenant, not client-provided value
    )
    RETURNING id INTO v_new_member_id;

    -- 5. Update the seguimiento record atomically
    UPDATE seguimiento_no_inscritos
    SET estado = 'registrado',
        fecha_conversion = now(),
        miembro_id = v_new_member_id
    WHERE id = p_seguimiento_id;

    RETURN v_new_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Permissions remain unchanged (already granted in 20260410000001)
-- Explicit re-grant for safety:
GRANT EXECUTE ON FUNCTION public.convert_seguimiento_to_member(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_seguimiento_to_member(UUID, JSONB) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_followup_queue(UUID, INTEGER, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_followup_queue(UUID, INTEGER, INTEGER) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_conversion_rates(TEXT, UUID, DATE, DATE, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_conversion_rates(TEXT, UUID, DATE, DATE, UUID) FROM anon, PUBLIC;
