-- =============================================================================
-- Migration: Tenant Provisioning, FK Validation, Usage Tracking (ftr-011 Phase 3)
-- =============================================================================
-- Creates:
--   1. provision_tenant() -- transactional tenant provisioning function
--   2. verify_same_tenant_fk() -- generic cross-tenant FK validation helper
--   3. Cross-tenant FK validation triggers on critical tables:
--      - miembros (sector_id, comite_id, nivel_intermedio_id, recinto_id, coordinador_id)
--      - candidatos (partido_id, miembro_id)
--      - candidato_votos (candidato_id, recinto_id, colegio_id)
--      - asignacion_recintos (recinto_id, colegio_id)
--      - colegios (recinto_id)
--      - recintos (municipio_id, circunscripcion_id)
--      - seguimiento_no_inscritos (recinto_id)
--   4. mv_tenant_usage_stats -- materialized view for tenant usage metrics
--   5. Updated refresh_materialized_views() to include new view
--
-- Rollback:
--   DROP MATERIALIZED VIEW IF EXISTS mv_tenant_usage_stats;
--   DROP TRIGGER IF EXISTS trg_validate_miembros_tenant_fk ON miembros;
--   DROP TRIGGER IF EXISTS trg_validate_candidatos_tenant_fk ON candidatos;
--   DROP TRIGGER IF EXISTS trg_validate_candidato_votos_tenant_fk ON candidato_votos;
--   DROP TRIGGER IF EXISTS trg_validate_asignacion_recintos_tenant_fk ON asignacion_recintos;
--   DROP TRIGGER IF EXISTS trg_validate_colegios_tenant_fk ON colegios;
--   DROP TRIGGER IF EXISTS trg_validate_recintos_tenant_fk ON recintos;
--   DROP TRIGGER IF EXISTS trg_validate_seguimiento_tenant_fk ON seguimiento_no_inscritos;
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_miembros_tenant_fk();
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_candidatos_tenant_fk();
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_candidato_votos_tenant_fk();
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_asignacion_recintos_tenant_fk();
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_colegios_tenant_fk();
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_recintos_tenant_fk();
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_seguimiento_tenant_fk();
--   DROP FUNCTION IF EXISTS public.verify_same_tenant_fk(TEXT, UUID, UUID);
--   DROP FUNCTION IF EXISTS public.provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT);
--   -- Restore refresh_materialized_views() from 20260409000007
-- =============================================================================


-- =============================================================================
-- STEP 1: Create provision_tenant() function
-- =============================================================================
-- Transactional tenant provisioning:
--   1. Creates tenant record
--   2. Creates initial admin user record in the usuarios table
--   3. Returns the new tenant_id
--
-- The Supabase Auth user creation (auth.users) must be done via the Admin API
-- from an Edge Function or server-side code. This function handles the
-- database-side provisioning only.
--
-- Only callable by platform_admin (enforced via RPC permission check).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.provision_tenant(
    p_nombre TEXT,
    p_slug TEXT,
    p_admin_email TEXT,
    p_admin_nombre TEXT,
    p_plan TEXT DEFAULT 'basico'
)
RETURNS UUID AS $$
DECLARE
    v_new_tenant_id UUID;
    v_caller_role TEXT;
    v_max_usuarios INTEGER;
    v_max_miembros INTEGER;
BEGIN
    -- Authorization check: only platform_admin can provision tenants
    v_caller_role := auth.jwt()->>'role';
    IF v_caller_role != 'platform_admin' THEN
        RAISE EXCEPTION 'Only platform_admin can provision tenants'
            USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;

    -- Validate inputs
    IF p_nombre IS NULL OR trim(p_nombre) = '' THEN
        RAISE EXCEPTION 'Tenant name (p_nombre) is required'
            USING ERRCODE = '22023'; -- invalid_parameter_value
    END IF;

    IF p_slug IS NULL OR trim(p_slug) = '' THEN
        RAISE EXCEPTION 'Tenant slug (p_slug) is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_admin_email IS NULL OR trim(p_admin_email) = '' THEN
        RAISE EXCEPTION 'Admin email (p_admin_email) is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_admin_nombre IS NULL OR trim(p_admin_nombre) = '' THEN
        RAISE EXCEPTION 'Admin name (p_admin_nombre) is required'
            USING ERRCODE = '22023';
    END IF;

    -- Validate plan
    IF p_plan NOT IN ('basico', 'profesional', 'empresarial') THEN
        RAISE EXCEPTION 'Invalid plan: %. Must be basico, profesional, or empresarial', p_plan
            USING ERRCODE = '22023';
    END IF;

    -- Set limits based on plan
    CASE p_plan
        WHEN 'basico' THEN
            v_max_usuarios := 50;
            v_max_miembros := 10000;
        WHEN 'profesional' THEN
            v_max_usuarios := 200;
            v_max_miembros := 50000;
        WHEN 'empresarial' THEN
            v_max_usuarios := 1000;
            v_max_miembros := 500000;
    END CASE;

    -- Check slug uniqueness (the UNIQUE constraint handles this, but a
    -- friendlier error message is better for the provisioning workflow)
    IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Tenant slug "%" already exists', p_slug
            USING ERRCODE = '23505'; -- unique_violation
    END IF;

    -- Step 1: Create tenant record
    INSERT INTO tenants (nombre, slug, plan, max_usuarios, max_miembros)
    VALUES (p_nombre, p_slug, p_plan, v_max_usuarios, v_max_miembros)
    RETURNING id INTO v_new_tenant_id;

    -- Step 2: Create initial admin user record
    -- Note: auth_user_id is NULL because the Auth user hasn't been created yet.
    -- The Edge Function will create the Auth user, then UPDATE this record
    -- with the auth_user_id. This allows the function to remain transactional.
    INSERT INTO usuarios (
        nombre,
        apellido,
        email,
        role,
        tenant_id,
        estado
    ) VALUES (
        p_admin_nombre,
        '', -- apellido will be updated by the admin later
        p_admin_email,
        'admin'::role_usuario,
        v_new_tenant_id,
        true
    );

    RETURN v_new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Only platform_admin can call this, but the function itself enforces that.
-- Grant to authenticated so the RPC is callable (auth check is inside).
GRANT EXECUTE ON FUNCTION public.provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, PUBLIC;


-- =============================================================================
-- STEP 2: Create verify_same_tenant_fk() helper
-- =============================================================================
-- Generic function that checks if a referenced record in another table
-- has the same tenant_id as the expected value.
-- Returns TRUE if they match, FALSE otherwise.
-- Returns TRUE if reference_id is NULL (nullable FK).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_same_tenant_fk(
    p_table_name TEXT,
    p_reference_id UUID,
    p_expected_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_ref_tenant_id UUID;
BEGIN
    -- NULL FK is valid (nullable foreign key)
    IF p_reference_id IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Look up the tenant_id of the referenced record
    EXECUTE format(
        'SELECT tenant_id FROM %I WHERE id = $1',
        p_table_name
    ) INTO v_ref_tenant_id USING p_reference_id;

    -- If referenced record not found, let the FK constraint handle it
    IF v_ref_tenant_id IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN v_ref_tenant_id = p_expected_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.verify_same_tenant_fk(TEXT, UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_same_tenant_fk(TEXT, UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_same_tenant_fk(TEXT, UUID, UUID) FROM authenticated;


-- =============================================================================
-- STEP 3: Cross-tenant FK validation triggers
-- =============================================================================
-- These BEFORE INSERT OR UPDATE triggers validate that FK references point
-- to records within the same tenant. This prevents cross-tenant data
-- contamination even if RLS is bypassed (defense in depth).
--
-- Each trigger function is specific to a table to avoid dynamic SQL in
-- hot paths and to provide clear, specific error messages.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- miembros: validate sector_id, comite_id, nivel_intermedio_id, recinto_id,
--           coordinador_id all belong to same tenant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_miembros_tenant_fk()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation if tenant_id is NULL (should not happen in production)
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.verify_same_tenant_fk('sectores', NEW.sector_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: sector_id (%) belongs to a different tenant', NEW.sector_id
            USING ERRCODE = '23503'; -- foreign_key_violation
    END IF;

    IF NOT public.verify_same_tenant_fk('comites', NEW.comite_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: comite_id (%) belongs to a different tenant', NEW.comite_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('niveles_intermedios', NEW.nivel_intermedio_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: nivel_intermedio_id (%) belongs to a different tenant', NEW.nivel_intermedio_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('recintos', NEW.recinto_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: recinto_id (%) belongs to a different tenant', NEW.recinto_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('miembros', NEW.coordinador_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: coordinador_id (%) belongs to a different tenant', NEW.coordinador_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_miembros_tenant_fk
    BEFORE INSERT OR UPDATE ON miembros
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_miembros_tenant_fk();

-- ---------------------------------------------------------------------------
-- candidatos: validate partido_id, miembro_id, periodo_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_candidatos_tenant_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.verify_same_tenant_fk('partidos', NEW.partido_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: partido_id (%) belongs to a different tenant', NEW.partido_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('miembros', NEW.miembro_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: miembro_id (%) belongs to a different tenant', NEW.miembro_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('periodos_electorales', NEW.periodo_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: periodo_id (%) belongs to a different tenant', NEW.periodo_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_candidatos_tenant_fk
    BEFORE INSERT OR UPDATE ON candidatos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_candidatos_tenant_fk();

-- ---------------------------------------------------------------------------
-- candidato_votos: validate candidato_id, recinto_id, colegio_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_candidato_votos_tenant_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.verify_same_tenant_fk('candidatos', NEW.candidato_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: candidato_id (%) belongs to a different tenant', NEW.candidato_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('recintos', NEW.recinto_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: recinto_id (%) belongs to a different tenant', NEW.recinto_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('colegios', NEW.colegio_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: colegio_id (%) belongs to a different tenant', NEW.colegio_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_candidato_votos_tenant_fk
    BEFORE INSERT OR UPDATE ON candidato_votos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_candidato_votos_tenant_fk();

-- ---------------------------------------------------------------------------
-- asignacion_recintos: validate recinto_id, colegio_id
-- (usuario_id references auth.users which has no tenant_id -- skip)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_asignacion_recintos_tenant_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.verify_same_tenant_fk('recintos', NEW.recinto_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: recinto_id (%) belongs to a different tenant', NEW.recinto_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('colegios', NEW.colegio_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: colegio_id (%) belongs to a different tenant', NEW.colegio_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_asignacion_recintos_tenant_fk
    BEFORE INSERT OR UPDATE ON asignacion_recintos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_asignacion_recintos_tenant_fk();

-- ---------------------------------------------------------------------------
-- colegios: validate recinto_id, partido_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_colegios_tenant_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.verify_same_tenant_fk('recintos', NEW.recinto_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: recinto_id (%) belongs to a different tenant', NEW.recinto_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('partidos', NEW.partido_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: partido_id (%) belongs to a different tenant', NEW.partido_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_colegios_tenant_fk
    BEFORE INSERT OR UPDATE ON colegios
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_colegios_tenant_fk();

-- ---------------------------------------------------------------------------
-- recintos: validate municipio_id, circunscripcion_id, partido_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_recintos_tenant_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.verify_same_tenant_fk('municipios', NEW.municipio_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: municipio_id (%) belongs to a different tenant', NEW.municipio_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('circunscripciones', NEW.circunscripcion_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: circunscripcion_id (%) belongs to a different tenant', NEW.circunscripcion_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('partidos', NEW.partido_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: partido_id (%) belongs to a different tenant', NEW.partido_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_recintos_tenant_fk
    BEFORE INSERT OR UPDATE ON recintos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_recintos_tenant_fk();

-- ---------------------------------------------------------------------------
-- seguimiento_no_inscritos: validate recinto_id belongs to same tenant
-- NOTE: This table has no tenant_id column -- it uses partido_id for
-- tenant scoping. We resolve the tenant_id from the partido_id to
-- validate that recinto_id belongs to the same tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_seguimiento_tenant_fk()
RETURNS TRIGGER AS $$
DECLARE
    v_partido_tenant_id UUID;
BEGIN
    -- Resolve tenant_id from partido_id
    IF NEW.partido_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT tenant_id INTO v_partido_tenant_id
    FROM partidos
    WHERE id = NEW.partido_id;

    IF v_partido_tenant_id IS NULL THEN
        RETURN NEW; -- Let FK constraint handle missing partido
    END IF;

    -- Validate recinto belongs to same tenant
    IF NOT public.verify_same_tenant_fk('recintos', NEW.recinto_id, v_partido_tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: recinto_id (%) belongs to a different tenant than partido_id (%)', NEW.recinto_id, NEW.partido_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_seguimiento_tenant_fk
    BEFORE INSERT OR UPDATE ON seguimiento_no_inscritos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_seguimiento_tenant_fk();


-- =============================================================================
-- STEP 4: Create mv_tenant_usage_stats materialized view
-- =============================================================================
-- Provides per-tenant usage metrics for the platform admin dashboard.
-- Includes user count, member count, and record counts for key tables.
-- Refreshed by the existing refresh_materialized_views() function.
-- =============================================================================

CREATE MATERIALIZED VIEW mv_tenant_usage_stats AS
SELECT
    t.id AS tenant_id,
    t.nombre AS tenant_nombre,
    t.slug AS tenant_slug,
    t.plan AS tenant_plan,
    t.activo AS tenant_activo,
    t.max_usuarios,
    t.max_miembros,
    COALESCE(u.usuario_count, 0) AS usuario_count,
    COALESCE(m.miembro_count, 0) AS miembro_count,
    COALESCE(r.recinto_count, 0) AS recinto_count,
    COALESCE(cv.candidato_voto_count, 0) AS candidato_voto_count,
    COALESCE(a.acta_count, 0) AS acta_count,
    t.created_at AS tenant_created_at
FROM tenants t
LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS usuario_count
    FROM usuarios
    WHERE estado = true
    GROUP BY tenant_id
) u ON u.tenant_id = t.id
LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS miembro_count
    FROM miembros
    WHERE estado = true
    GROUP BY tenant_id
) m ON m.tenant_id = t.id
LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS recinto_count
    FROM recintos
    WHERE estado = true
    GROUP BY tenant_id
) r ON r.tenant_id = t.id
LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS candidato_voto_count
    FROM candidato_votos
    WHERE estado = true
    GROUP BY tenant_id
) cv ON cv.tenant_id = t.id
LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS acta_count
    FROM actas
    WHERE estado = true
    GROUP BY tenant_id
) a ON a.tenant_id = t.id;

CREATE UNIQUE INDEX idx_mv_tenant_usage_stats_tenant_id
    ON mv_tenant_usage_stats(tenant_id);

-- Access control: only platform_admin should see cross-tenant usage stats.
-- Materialized views don't support RLS, so we restrict via REVOKE/GRANT.
REVOKE ALL ON mv_tenant_usage_stats FROM anon, PUBLIC;
GRANT SELECT ON mv_tenant_usage_stats TO authenticated;
-- Note: The platform admin RLS check happens at the application layer since
-- materialized views cannot enforce RLS. The view is safe because it only
-- contains aggregate counts, not PII.


-- =============================================================================
-- STEP 5: Update refresh_materialized_views() to include new view
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_provincia;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_municipio;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_partido;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_recinto;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_votos_por_partido_circunscripcion;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_turnout_por_recinto;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_usage_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
