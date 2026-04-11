-- =============================================================================
-- Migration: Dashboard Materialized Views & Realtime (ftr-007)
-- =============================================================================
-- Creates the three materialized views required by the Dashboard & Analytics
-- feature (ftr-007), along with:
--
--   - mv_member_counts: member counts by ALL geographic levels (provincia,
--     municipio, circunscripcion, sector), broken down by tipo_miembro
--   - mv_registration_daily: daily member registration counts for trend charts
--   - mv_vote_totals_by_candidato: per-candidato vote totals by recinto and
--     periodo for granular candidate comparison charts
--
-- Additionally:
--   - Security wrapper functions that enforce tenant isolation and geographic
--     scope on the materialized views (since MVs do not support RLS natively)
--   - Updated refresh_materialized_views() to include the new views
--   - Realtime verification (candidato_votos and actas were already added to
--     supabase_realtime in 20260409000007; this migration adds partido_votos)
--
-- Why wrapper functions instead of raw MV access:
--   Materialized views aggregate across all tenants and geographic scopes.
--   The I-2 security remediation (20260409000004) noted this gap. These wrapper
--   functions enforce tenant_id filtering and geographic scope checks so the
--   frontend can query them via PostgREST RPC and receive only authorized data.
--
-- Rollback:
--   -- Drop wrapper functions
--   DROP FUNCTION IF EXISTS public.get_vote_totals_by_candidato(UUID);
--   DROP FUNCTION IF EXISTS public.get_registration_daily(DATE, DATE);
--   DROP FUNCTION IF EXISTS public.get_member_counts(TEXT);
--   -- Drop selective refresh function
--   DROP FUNCTION IF EXISTS public.refresh_dashboard_views(TEXT);
--   -- Drop materialized views
--   DROP MATERIALIZED VIEW IF EXISTS mv_vote_totals_by_candidato;
--   DROP MATERIALIZED VIEW IF EXISTS mv_registration_daily;
--   DROP MATERIALIZED VIEW IF EXISTS mv_member_counts;
--   -- Restore previous refresh_materialized_views() from 20260409000007:
--   CREATE OR REPLACE FUNCTION refresh_materialized_views()
--   RETURNS void AS $$ BEGIN
--     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_provincia;
--     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_municipio;
--     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_partido;
--     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_recinto;
--     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_votos_por_partido_circunscripcion;
--     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_turnout_por_recinto;
--   END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
--   REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC, anon, authenticated;
--   -- Remove partido_votos from realtime
--   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS partido_votos;
-- =============================================================================


-- =============================================================================
-- STEP 1: Materialized View — mv_member_counts
-- =============================================================================
-- Aggregates member counts at EVERY geographic level in a single view.
-- Each row represents a unique geographic node (provincia, municipio,
-- circunscripcion, or sector) with counts broken down by tipo_miembro.
-- The `nivel` column identifies the geographic level for filtering.
--
-- This replaces the need to query mv_member_count_by_provincia and
-- mv_member_count_by_municipio separately; the dashboard can filter by nivel.
-- =============================================================================

CREATE MATERIALIZED VIEW mv_member_counts AS
-- Provincia level
SELECT
    'provincia'::TEXT AS nivel,
    p.id AS geo_id,
    p.nombre AS geo_nombre,
    p.id AS provincia_id,
    NULL::UUID AS municipio_id,
    NULL::UUID AS circunscripcion_id,
    NULL::UUID AS sector_id,
    p.tenant_id,
    COUNT(m.id) AS total_miembros,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador') AS coordinadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador') AS multiplicadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado') AS relacionados
FROM provincias p
LEFT JOIN municipios mu ON mu.provincia_id = p.id
LEFT JOIN circunscripciones c ON c.municipio_id = mu.id
LEFT JOIN sectores s ON s.circunscripcion_id = c.id
LEFT JOIN miembros m ON m.sector_id = s.id AND m.estado = true
WHERE p.estado = true
GROUP BY p.id, p.nombre, p.tenant_id

UNION ALL

-- Municipio level
SELECT
    'municipio'::TEXT AS nivel,
    mu.id AS geo_id,
    mu.nombre AS geo_nombre,
    mu.provincia_id,
    mu.id AS municipio_id,
    NULL::UUID AS circunscripcion_id,
    NULL::UUID AS sector_id,
    mu.tenant_id,
    COUNT(m.id) AS total_miembros,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador') AS coordinadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador') AS multiplicadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado') AS relacionados
FROM municipios mu
LEFT JOIN circunscripciones c ON c.municipio_id = mu.id
LEFT JOIN sectores s ON s.circunscripcion_id = c.id
LEFT JOIN miembros m ON m.sector_id = s.id AND m.estado = true
WHERE mu.estado = true
GROUP BY mu.id, mu.nombre, mu.provincia_id, mu.tenant_id

UNION ALL

-- Circunscripcion level
SELECT
    'circunscripcion'::TEXT AS nivel,
    c.id AS geo_id,
    c.nombre AS geo_nombre,
    mu.provincia_id,
    c.municipio_id,
    c.id AS circunscripcion_id,
    NULL::UUID AS sector_id,
    c.tenant_id,
    COUNT(m.id) AS total_miembros,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador') AS coordinadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador') AS multiplicadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado') AS relacionados
FROM circunscripciones c
INNER JOIN municipios mu ON mu.id = c.municipio_id
LEFT JOIN sectores s ON s.circunscripcion_id = c.id
LEFT JOIN miembros m ON m.sector_id = s.id AND m.estado = true
WHERE c.estado = true
GROUP BY c.id, c.nombre, mu.provincia_id, c.municipio_id, c.tenant_id

UNION ALL

-- Sector level
SELECT
    'sector'::TEXT AS nivel,
    s.id AS geo_id,
    s.nombre AS geo_nombre,
    mu.provincia_id,
    c.municipio_id,
    s.circunscripcion_id,
    s.id AS sector_id,
    s.tenant_id,
    COUNT(m.id) AS total_miembros,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador') AS coordinadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador') AS multiplicadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado') AS relacionados
FROM sectores s
INNER JOIN circunscripciones c ON c.id = s.circunscripcion_id
INNER JOIN municipios mu ON mu.id = c.municipio_id
LEFT JOIN miembros m ON m.sector_id = s.id AND m.estado = true
WHERE s.estado = true
GROUP BY s.id, s.nombre, mu.provincia_id, c.municipio_id, s.circunscripcion_id, s.tenant_id;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_member_counts_pk
    ON mv_member_counts(nivel, geo_id, tenant_id);

-- Indexes for common query patterns
CREATE INDEX idx_mv_member_counts_nivel ON mv_member_counts(nivel);
CREATE INDEX idx_mv_member_counts_tenant_id ON mv_member_counts(tenant_id);
CREATE INDEX idx_mv_member_counts_provincia_id ON mv_member_counts(provincia_id);
CREATE INDEX idx_mv_member_counts_municipio_id ON mv_member_counts(municipio_id);
CREATE INDEX idx_mv_member_counts_circunscripcion_id ON mv_member_counts(circunscripcion_id);


-- =============================================================================
-- STEP 2: Materialized View — mv_registration_daily
-- =============================================================================
-- Daily registration counts for the registration progress line chart.
-- Groups by DATE(created_at) and tenant_id. Includes tipo_miembro breakdown
-- so the dashboard can show stacked area charts by member type.
-- =============================================================================

CREATE MATERIALIZED VIEW mv_registration_daily AS
SELECT
    DATE(m.created_at) AS registration_date,
    m.tenant_id,
    COUNT(*) AS total_registrations,
    COUNT(*) FILTER (WHERE m.tipo_miembro = 'coordinador') AS coordinadores,
    COUNT(*) FILTER (WHERE m.tipo_miembro = 'multiplicador') AS multiplicadores,
    COUNT(*) FILTER (WHERE m.tipo_miembro = 'relacionado') AS relacionados
FROM miembros m
WHERE m.estado = true
GROUP BY DATE(m.created_at), m.tenant_id
ORDER BY registration_date;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_registration_daily_pk
    ON mv_registration_daily(registration_date, tenant_id);

-- Index for date range queries
CREATE INDEX idx_mv_registration_daily_tenant_id
    ON mv_registration_daily(tenant_id);


-- =============================================================================
-- STEP 3: Materialized View — mv_vote_totals_by_candidato
-- =============================================================================
-- Per-candidato vote totals for candidate comparison charts on election night.
-- Groups by recinto, partido, candidato, and periodo for maximum drill-down.
-- Joins to candidatos and partidos to include display names and colors.
-- =============================================================================

CREATE MATERIALIZED VIEW mv_vote_totals_by_candidato AS
SELECT
    cv.recinto_id,
    r.nombre AS recinto_nombre,
    r.cod_recinto AS recinto_codigo,
    r.municipio_id,
    mu.nombre AS municipio_nombre,
    r.circunscripcion_id,
    cv.partido_id,
    pa.nombre AS partido_nombre,
    pa.siglas AS partido_siglas,
    pa.color AS partido_color,
    cv.candidato_id,
    ca.nombre AS candidato_nombre,
    ca.orden AS candidato_orden,
    cv.periodo_id,
    pe.nombre AS periodo_nombre,
    cv.tenant_id,
    SUM(cv.votos) AS total_votos,
    COUNT(DISTINCT cv.colegio_id) AS colegios_reportados
FROM candidato_votos cv
INNER JOIN candidatos ca ON ca.id = cv.candidato_id
INNER JOIN partidos pa ON pa.id = cv.partido_id
INNER JOIN recintos r ON r.id = cv.recinto_id
INNER JOIN municipios mu ON mu.id = r.municipio_id
LEFT JOIN periodos_electorales pe ON pe.id = cv.periodo_id
WHERE cv.estado = true
GROUP BY
    cv.recinto_id, r.nombre, r.cod_recinto, r.municipio_id, mu.nombre,
    r.circunscripcion_id, cv.partido_id, pa.nombre, pa.siglas, pa.color,
    cv.candidato_id, ca.nombre, ca.orden, cv.periodo_id, pe.nombre,
    cv.tenant_id;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_vote_totals_candidato_pk
    ON mv_vote_totals_by_candidato(candidato_id, recinto_id, periodo_id, partido_id, tenant_id);

-- Indexes for common dashboard query patterns
CREATE INDEX idx_mv_vote_totals_candidato_periodo
    ON mv_vote_totals_by_candidato(periodo_id);
CREATE INDEX idx_mv_vote_totals_candidato_partido
    ON mv_vote_totals_by_candidato(partido_id);
CREATE INDEX idx_mv_vote_totals_candidato_recinto
    ON mv_vote_totals_by_candidato(recinto_id);
CREATE INDEX idx_mv_vote_totals_candidato_tenant
    ON mv_vote_totals_by_candidato(tenant_id);
CREATE INDEX idx_mv_vote_totals_candidato_circunscripcion
    ON mv_vote_totals_by_candidato(circunscripcion_id);


-- =============================================================================
-- STEP 4: Access control — REVOKE from anon/PUBLIC, GRANT to authenticated
-- =============================================================================
-- Follows the security remediation pattern from 20260409000004 (I-2).
-- Materialized views do not support RLS, so REVOKE/GRANT is the first line
-- of defense. Wrapper functions (Step 6) provide tenant + scope filtering.
-- =============================================================================

REVOKE ALL ON mv_member_counts FROM anon, PUBLIC;
REVOKE ALL ON mv_registration_daily FROM anon, PUBLIC;
REVOKE ALL ON mv_vote_totals_by_candidato FROM anon, PUBLIC;

GRANT SELECT ON mv_member_counts TO authenticated;
GRANT SELECT ON mv_registration_daily TO authenticated;
GRANT SELECT ON mv_vote_totals_by_candidato TO authenticated;


-- =============================================================================
-- STEP 5: Update refresh_materialized_views() to include new views
-- =============================================================================
-- Replaces the function created in 20260409000007 with an expanded version
-- that includes the three new dashboard views. Maintains CONCURRENTLY refresh
-- on all views (requires unique indexes, which we created above).
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    -- Original views (from 20260408234055)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_provincia;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_municipio;

    -- Electoral monitoring views (from 20260409000007)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_partido;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_recinto;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_votos_por_partido_circunscripcion;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_turnout_por_recinto;

    -- Dashboard views (ftr-007)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_counts;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_registration_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_candidato;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Maintain the existing REVOKE pattern from 20260409000004 (I-3)
-- refresh_materialized_views() should only be callable by service_role/postgres
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM authenticated;


-- =============================================================================
-- STEP 6: Selective refresh function for dashboard-relevant views only
-- =============================================================================
-- Allows refreshing only the dashboard-specific views without the overhead
-- of refreshing all 9 materialized views. Useful when triggered by member
-- registration events or vote recording events.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refresh_dashboard_views(
    p_category TEXT DEFAULT 'all'  -- 'members', 'votes', 'all'
)
RETURNS void AS $$
BEGIN
    IF p_category = 'members' OR p_category = 'all' THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_counts;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_registration_daily;
    END IF;

    IF p_category = 'votes' OR p_category = 'all' THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_candidato;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_partido;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_recinto;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_votos_por_partido_circunscripcion;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_turnout_por_recinto;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Only service_role/postgres can call this
REVOKE EXECUTE ON FUNCTION public.refresh_dashboard_views(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_dashboard_views(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_dashboard_views(TEXT) FROM authenticated;


-- =============================================================================
-- STEP 7: Security wrapper functions — tenant + geographic scope enforcement
-- =============================================================================
-- These PostgREST-callable RPC functions enforce tenant isolation and
-- geographic scope filtering that materialized views cannot enforce natively.
-- The frontend calls these via supabase.rpc('get_member_counts', { ... })
-- instead of querying the materialized views directly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Function: get_member_counts(periodo_nivel, scope_filter)
-- ---------------------------------------------------------------------------
-- Returns member counts filtered by the authenticated user's tenant_id and
-- geographic scope. The `p_nivel` parameter allows filtering to a specific
-- geographic level ('provincia', 'municipio', 'circunscripcion', 'sector')
-- or NULL for all levels.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_member_counts(
    p_nivel TEXT DEFAULT NULL
)
RETURNS TABLE (
    nivel TEXT,
    geo_id UUID,
    geo_nombre TEXT,
    provincia_id UUID,
    municipio_id UUID,
    circunscripcion_id UUID,
    sector_id UUID,
    total_miembros BIGINT,
    coordinadores BIGINT,
    multiplicadores BIGINT,
    relacionados BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
    v_scope_level TEXT;
    v_scope_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();
    v_scope_level := public.get_my_scope_level();
    v_scope_id := public.get_my_scope_id();

    RETURN QUERY
    SELECT
        mc.nivel,
        mc.geo_id,
        mc.geo_nombre,
        mc.provincia_id,
        mc.municipio_id,
        mc.circunscripcion_id,
        mc.sector_id,
        mc.total_miembros,
        mc.coordinadores,
        mc.multiplicadores,
        mc.relacionados
    FROM mv_member_counts mc
    WHERE mc.tenant_id = v_tenant_id
      AND (p_nivel IS NULL OR mc.nivel = p_nivel)
      AND (
          -- Admin: no geographic scope restriction
          v_scope_level IS NULL
          -- Provincia scope: show all data within that provincia
          OR (v_scope_level = 'provincia' AND mc.provincia_id = v_scope_id)
          -- Municipio scope: show only data within that municipio
          OR (v_scope_level = 'municipio' AND mc.municipio_id = v_scope_id)
          -- Circunscripcion scope: show only data within that circunscripcion
          OR (v_scope_level = 'circunscripcion' AND mc.circunscripcion_id = v_scope_id)
      );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- ---------------------------------------------------------------------------
-- Function: get_registration_daily(periodo_id, date_from, date_to)
-- ---------------------------------------------------------------------------
-- Returns daily registration counts filtered by tenant and date range.
-- Geographic scope is NOT applied here because the registration_daily view
-- aggregates across all geographies (the member bar chart handles geographic
-- breakdown). If scope filtering is needed in the future, the mv can be
-- extended with geographic columns.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_registration_daily(
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    registration_date DATE,
    total_registrations BIGINT,
    coordinadores BIGINT,
    multiplicadores BIGINT,
    relacionados BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        rd.registration_date,
        rd.total_registrations,
        rd.coordinadores,
        rd.multiplicadores,
        rd.relacionados
    FROM mv_registration_daily rd
    WHERE rd.tenant_id = v_tenant_id
      AND (p_date_from IS NULL OR rd.registration_date >= p_date_from)
      AND (p_date_to IS NULL OR rd.registration_date <= p_date_to)
    ORDER BY rd.registration_date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- ---------------------------------------------------------------------------
-- Function: get_vote_totals_by_candidato(periodo_id)
-- ---------------------------------------------------------------------------
-- Returns per-candidato vote totals filtered by tenant, periodo, and the
-- user's geographic scope. Admins see all recintos; coordinators see only
-- recintos within their assigned geographic area; observers see their
-- assigned recintos.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vote_totals_by_candidato(
    p_periodo_id UUID
)
RETURNS TABLE (
    recinto_id UUID,
    recinto_nombre VARCHAR,
    recinto_codigo VARCHAR,
    municipio_id UUID,
    municipio_nombre VARCHAR,
    circunscripcion_id UUID,
    partido_id UUID,
    partido_nombre VARCHAR,
    partido_siglas VARCHAR,
    partido_color VARCHAR,
    candidato_id UUID,
    candidato_nombre VARCHAR,
    candidato_orden INTEGER,
    periodo_id UUID,
    periodo_nombre VARCHAR,
    total_votos BIGINT,
    colegios_reportados BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
    v_scope_level TEXT;
    v_scope_id UUID;
    v_role TEXT;
BEGIN
    v_tenant_id := public.get_my_tenant_id();
    v_scope_level := public.get_my_scope_level();
    v_scope_id := public.get_my_scope_id();
    v_role := public.get_my_role();

    RETURN QUERY
    SELECT
        vt.recinto_id,
        vt.recinto_nombre,
        vt.recinto_codigo,
        vt.municipio_id,
        vt.municipio_nombre,
        vt.circunscripcion_id,
        vt.partido_id,
        vt.partido_nombre,
        vt.partido_siglas,
        vt.partido_color,
        vt.candidato_id,
        vt.candidato_nombre,
        vt.candidato_orden,
        vt.periodo_id,
        vt.periodo_nombre,
        vt.total_votos,
        vt.colegios_reportados
    FROM mv_vote_totals_by_candidato vt
    WHERE vt.tenant_id = v_tenant_id
      AND vt.periodo_id = p_periodo_id
      AND (
          -- Admin: sees everything
          v_role = 'admin'
          -- Coordinator with geographic scope
          OR (v_role = 'coordinator' AND (
              v_scope_level IS NULL
              OR (v_scope_level = 'provincia' AND vt.municipio_id IN (
                  SELECT m.id FROM municipios m WHERE m.provincia_id = v_scope_id
              ))
              OR (v_scope_level = 'municipio' AND vt.municipio_id = v_scope_id)
              OR (v_scope_level = 'circunscripcion' AND vt.circunscripcion_id = v_scope_id)
          ))
          -- Observer: sees assigned recintos only
          OR (v_role = 'observer' AND EXISTS (
              SELECT 1 FROM asignacion_recintos ar
              WHERE ar.usuario_id = auth.uid()
                AND ar.recinto_id = vt.recinto_id
                AND ar.periodo_id = p_periodo_id
                AND ar.estado = true
          ))
      )
    ORDER BY vt.partido_nombre, vt.candidato_orden;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 8: Grant/Revoke on wrapper functions
-- =============================================================================
-- Wrapper functions are callable by authenticated users (RPC).
-- Revoke from anon and PUBLIC.
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_member_counts(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_daily(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vote_totals_by_candidato(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_member_counts(TEXT) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_registration_daily(DATE, DATE) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_vote_totals_by_candidato(UUID) FROM anon, PUBLIC;


-- =============================================================================
-- STEP 9: Enable Supabase Realtime on partido_votos
-- =============================================================================
-- candidato_votos and actas were already added to supabase_realtime in
-- 20260409000007 (Step 14). Adding partido_votos enables the dashboard to
-- also subscribe to party-level vote aggregation updates in real-time.
-- votaciones was dropped in 20260409000007 and replaced by the new schema.
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE partido_votos;
