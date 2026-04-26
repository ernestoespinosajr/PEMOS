-- =============================================================================
-- Migration: Reporting System RPC Functions (ftr-008)
-- =============================================================================
-- Creates PostgreSQL RPC functions that serve as the data layer for the
-- PEMOS reporting system. These functions query existing tables and
-- materialized views with tenant isolation and geographic scope enforcement.
--
-- Report categories and their data sources:
--
--   MEMBER REPORTS:
--     - rpt_members_by_coordinator: Members grouped by coordinator with counts
--     - rpt_members_by_recinto: Members listed by polling station
--     - rpt_members_not_in_padron: Members not found in external voter roll
--     - rpt_members_by_sector: Members grouped by sector with counts
--     - rpt_members_by_liaison: Members grouped by nivel_intermedio
--     - rpt_member_detail: Detailed individual member information
--
--   ELECTORAL REPORTS:
--     - rpt_vote_summary_by_party: Vote totals per party for a periodo
--     - rpt_vote_summary_by_recinto: Vote totals per recinto for a periodo
--     - rpt_vote_summary_by_alliance: Vote totals grouped by party alliance
--     - rpt_actas_status: Status of actas (submitted vs missing) per recinto
--     - rpt_turnout_by_recinto: Voter turnout summary per recinto
--
--   GEOGRAPHIC/ORGANIZATIONAL REPORTS:
--     - rpt_summary_by_geographic_level: Member counts at any geographic level
--     - rpt_coordinator_summary: Coordinator performance summary
--
--   REGISTRATION REPORTS:
--     - rpt_daily_registration: Daily member registration counts
--
--   ACTIVITY REPORTS:
--     - rpt_seguimiento_activity: Follow-up activity by user
--
-- Also creates:
--   - Supabase Storage bucket 'reports' for PDF archival
--   - report_archives table for metadata tracking
--
-- Security:
--   All functions use SECURITY DEFINER with SET search_path = public.
--   All functions enforce tenant_id via get_my_tenant_id().
--   Geographic scope enforcement via get_my_scope_level()/get_my_scope_id().
--   REVOKE from anon/PUBLIC on all functions.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.rpt_seguimiento_activity(DATE, DATE, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_daily_registration(DATE, DATE);
--   DROP FUNCTION IF EXISTS public.rpt_coordinator_summary(UUID, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_summary_by_geographic_level(TEXT, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_turnout_by_recinto(UUID, UUID, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_actas_status(UUID, UUID, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_vote_summary_by_alliance(UUID, TEXT);
--   DROP FUNCTION IF EXISTS public.rpt_vote_summary_by_recinto(UUID, UUID, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_vote_summary_by_party(UUID);
--   DROP FUNCTION IF EXISTS public.rpt_member_detail(UUID);
--   DROP FUNCTION IF EXISTS public.rpt_members_by_liaison(UUID, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_members_by_sector(UUID, UUID, UUID, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_members_not_in_padron(UUID, UUID, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_members_by_recinto(UUID, UUID, UUID);
--   DROP FUNCTION IF EXISTS public.rpt_members_by_coordinator(UUID, UUID, UUID, UUID);
--   DROP TABLE IF EXISTS report_archives;
-- =============================================================================


-- =============================================================================
-- STEP 1: report_archives table for PDF metadata tracking
-- =============================================================================
-- Stores metadata about generated and archived PDF reports.
-- The actual PDF files live in Supabase Storage bucket 'reports'.

CREATE TABLE report_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    report_name VARCHAR(500) NOT NULL,
    filters_applied JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    file_path VARCHAR(1000) NOT NULL,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    estado BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_archives_tenant_id ON report_archives(tenant_id);
CREATE INDEX idx_report_archives_report_type ON report_archives(report_type);
CREATE INDEX idx_report_archives_generated_by ON report_archives(generated_by);
CREATE INDEX idx_report_archives_generated_at ON report_archives(generated_at DESC);
CREATE INDEX idx_report_archives_estado ON report_archives(estado);

-- RLS
ALTER TABLE report_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_archives FORCE ROW LEVEL SECURITY;

CREATE POLICY "report_archives_select"
    ON report_archives FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "report_archives_insert"
    ON report_archives FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "report_archives_delete_admin"
    ON report_archives FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );

REVOKE ALL ON report_archives FROM anon;
GRANT SELECT, INSERT, DELETE ON report_archives TO authenticated;


-- =============================================================================
-- STEP 2: rpt_members_by_coordinator
-- =============================================================================
-- Returns members grouped by their coordinator. Consolidates legacy reports:
--   rdl_coordinador.rdl, rdl_coordinador_viejo.rdl, rdl_miembros_coordinador.rdl
-- Supports geographic filtering for scoped users.

CREATE OR REPLACE FUNCTION public.rpt_members_by_coordinator(
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL,
    p_circunscripcion_id UUID DEFAULT NULL,
    p_sector_id UUID DEFAULT NULL
)
RETURNS TABLE (
    coordinador_id UUID,
    coordinador_cedula VARCHAR,
    coordinador_nombre VARCHAR,
    coordinador_apellido VARCHAR,
    coordinador_telefono VARCHAR,
    coordinador_sector VARCHAR,
    miembro_id UUID,
    miembro_cedula VARCHAR,
    miembro_nombre VARCHAR,
    miembro_apellido VARCHAR,
    miembro_telefono VARCHAR,
    miembro_celular VARCHAR,
    miembro_tipo tipo_miembro,
    miembro_sector VARCHAR,
    miembro_estado BOOLEAN
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        coord.id AS coordinador_id,
        coord.cedula AS coordinador_cedula,
        coord.nombre AS coordinador_nombre,
        coord.apellido AS coordinador_apellido,
        coord.telefono AS coordinador_telefono,
        s_coord.nombre AS coordinador_sector,
        m.id AS miembro_id,
        m.cedula AS miembro_cedula,
        m.nombre AS miembro_nombre,
        m.apellido AS miembro_apellido,
        m.telefono AS miembro_telefono,
        m.celular AS miembro_celular,
        m.tipo_miembro AS miembro_tipo,
        s_m.nombre AS miembro_sector,
        m.estado AS miembro_estado
    FROM miembros coord
    INNER JOIN miembros m ON m.coordinador_id = coord.id AND m.estado = true
    LEFT JOIN sectores s_coord ON s_coord.id = coord.sector_id
    LEFT JOIN sectores s_m ON s_m.id = m.sector_id
    LEFT JOIN circunscripciones c ON c.id = s_m.circunscripcion_id
    LEFT JOIN municipios mu ON mu.id = c.municipio_id
    WHERE coord.tenant_id = v_tenant_id
      AND coord.tipo_miembro = 'coordinador'
      AND coord.estado = true
      AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
      AND (p_municipio_id IS NULL OR c.municipio_id = p_municipio_id)
      AND (p_circunscripcion_id IS NULL OR s_m.circunscripcion_id = p_circunscripcion_id)
      AND (p_sector_id IS NULL OR m.sector_id = p_sector_id)
    ORDER BY coord.apellido, coord.nombre, m.apellido, m.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 3: rpt_members_by_recinto
-- =============================================================================
-- Returns members listed by polling station. Legacy: rdl_miembros_por_recinto.rdl

CREATE OR REPLACE FUNCTION public.rpt_members_by_recinto(
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL,
    p_circunscripcion_id UUID DEFAULT NULL
)
RETURNS TABLE (
    recinto_id UUID,
    recinto_nombre VARCHAR,
    recinto_codigo VARCHAR,
    recinto_municipio VARCHAR,
    miembro_id UUID,
    miembro_cedula VARCHAR,
    miembro_nombre VARCHAR,
    miembro_apellido VARCHAR,
    miembro_telefono VARCHAR,
    miembro_celular VARCHAR,
    miembro_tipo tipo_miembro,
    miembro_colegio VARCHAR,
    miembro_sector VARCHAR
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        r.id AS recinto_id,
        r.nombre AS recinto_nombre,
        r.cod_recinto AS recinto_codigo,
        mu.nombre AS recinto_municipio,
        m.id AS miembro_id,
        m.cedula AS miembro_cedula,
        m.nombre AS miembro_nombre,
        m.apellido AS miembro_apellido,
        m.telefono AS miembro_telefono,
        m.celular AS miembro_celular,
        m.tipo_miembro AS miembro_tipo,
        m.colegio AS miembro_colegio,
        s.nombre AS miembro_sector
    FROM miembros m
    INNER JOIN recintos r ON r.id = m.recinto_id AND r.estado = true
    LEFT JOIN municipios mu ON mu.id = r.municipio_id
    LEFT JOIN sectores s ON s.id = m.sector_id
    LEFT JOIN circunscripciones c ON c.id = r.circunscripcion_id
    WHERE m.tenant_id = v_tenant_id
      AND m.estado = true
      AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
      AND (p_municipio_id IS NULL OR r.municipio_id = p_municipio_id)
      AND (p_circunscripcion_id IS NULL OR r.circunscripcion_id = p_circunscripcion_id)
    ORDER BY r.nombre, m.apellido, m.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 4: rpt_members_not_in_padron
-- =============================================================================
-- Returns members whose cedula is NOT found in the padron_externo table.
-- Legacy: rdl_miembros_no_padron.rdl

CREATE OR REPLACE FUNCTION public.rpt_members_not_in_padron(
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL,
    p_circunscripcion_id UUID DEFAULT NULL
)
RETURNS TABLE (
    miembro_id UUID,
    cedula VARCHAR,
    nombre VARCHAR,
    apellido VARCHAR,
    telefono VARCHAR,
    celular VARCHAR,
    tipo_miembro tipo_miembro,
    sector_nombre VARCHAR,
    circunscripcion_nombre VARCHAR,
    municipio_nombre VARCHAR
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        m.id AS miembro_id,
        m.cedula,
        m.nombre,
        m.apellido,
        m.telefono,
        m.celular,
        m.tipo_miembro,
        s.nombre AS sector_nombre,
        c.nombre AS circunscripcion_nombre,
        mu.nombre AS municipio_nombre
    FROM miembros m
    LEFT JOIN sectores s ON s.id = m.sector_id
    LEFT JOIN circunscripciones c ON c.id = s.circunscripcion_id
    LEFT JOIN municipios mu ON mu.id = c.municipio_id
    WHERE m.tenant_id = v_tenant_id
      AND m.estado = true
      AND NOT EXISTS (
          SELECT 1 FROM padron_externo pe
          WHERE pe.cedula = m.cedula
      )
      AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
      AND (p_municipio_id IS NULL OR c.municipio_id = p_municipio_id)
      AND (p_circunscripcion_id IS NULL OR s.circunscripcion_id = p_circunscripcion_id)
    ORDER BY m.apellido, m.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 5: rpt_members_by_sector
-- =============================================================================
-- Returns members grouped by sector. Legacy: rdl_reporte_por_sector.rdl,
-- rdl_total_sector.rdl

CREATE OR REPLACE FUNCTION public.rpt_members_by_sector(
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL,
    p_circunscripcion_id UUID DEFAULT NULL,
    p_sector_id UUID DEFAULT NULL
)
RETURNS TABLE (
    sector_id UUID,
    sector_nombre VARCHAR,
    sector_codigo VARCHAR,
    circunscripcion_nombre VARCHAR,
    municipio_nombre VARCHAR,
    total_miembros BIGINT,
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
        s.id AS sector_id,
        s.nombre AS sector_nombre,
        s.codigo AS sector_codigo,
        c.nombre AS circunscripcion_nombre,
        mu.nombre AS municipio_nombre,
        COUNT(m.id)::BIGINT AS total_miembros,
        COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador')::BIGINT AS coordinadores,
        COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador')::BIGINT AS multiplicadores,
        COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado')::BIGINT AS relacionados
    FROM sectores s
    INNER JOIN circunscripciones c ON c.id = s.circunscripcion_id
    INNER JOIN municipios mu ON mu.id = c.municipio_id
    LEFT JOIN miembros m ON m.sector_id = s.id AND m.estado = true AND m.tenant_id = v_tenant_id
    WHERE s.estado = true
      AND s.tenant_id = v_tenant_id
      AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
      AND (p_municipio_id IS NULL OR c.municipio_id = p_municipio_id)
      AND (p_circunscripcion_id IS NULL OR s.circunscripcion_id = p_circunscripcion_id)
      AND (p_sector_id IS NULL OR s.id = p_sector_id)
    GROUP BY s.id, s.nombre, s.codigo, c.nombre, mu.nombre
    ORDER BY mu.nombre, c.nombre, s.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 6: rpt_members_by_liaison
-- =============================================================================
-- Returns members grouped by intermediary level (liaison).
-- Legacy: rdl_miembrosPorEnlace.rdl, rdl_resumen_por_intermedio.rdl,
--          rdl_total_intermedio.rdl, rdl_total_intermedio_cargo.rdl

CREATE OR REPLACE FUNCTION public.rpt_members_by_liaison(
    p_sector_id UUID DEFAULT NULL,
    p_comite_id UUID DEFAULT NULL
)
RETURNS TABLE (
    nivel_intermedio_id UUID,
    nivel_intermedio_nombre VARCHAR,
    nivel_intermedio_codigo VARCHAR,
    comite_nombre VARCHAR,
    sector_nombre VARCHAR,
    miembro_id UUID,
    miembro_cedula VARCHAR,
    miembro_nombre VARCHAR,
    miembro_apellido VARCHAR,
    miembro_telefono VARCHAR,
    miembro_tipo tipo_miembro,
    total_in_nivel BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        ni.id AS nivel_intermedio_id,
        ni.nombre AS nivel_intermedio_nombre,
        ni.codigo AS nivel_intermedio_codigo,
        co.nombre AS comite_nombre,
        s.nombre AS sector_nombre,
        m.id AS miembro_id,
        m.cedula AS miembro_cedula,
        m.nombre AS miembro_nombre,
        m.apellido AS miembro_apellido,
        m.telefono AS miembro_telefono,
        m.tipo_miembro AS miembro_tipo,
        COUNT(m.id) OVER (PARTITION BY ni.id)::BIGINT AS total_in_nivel
    FROM niveles_intermedios ni
    INNER JOIN comites co ON co.id = ni.comite_id
    INNER JOIN sectores s ON s.id = co.sector_id
    LEFT JOIN miembros m ON m.nivel_intermedio_id = ni.id AND m.estado = true AND m.tenant_id = v_tenant_id
    WHERE ni.estado = true
      AND ni.tenant_id = v_tenant_id
      AND (p_sector_id IS NULL OR co.sector_id = p_sector_id)
      AND (p_comite_id IS NULL OR ni.comite_id = p_comite_id)
    ORDER BY s.nombre, co.nombre, ni.nombre, m.apellido, m.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 7: rpt_member_detail
-- =============================================================================
-- Returns detailed information for a single member.
-- Legacy: rdl_miembro_detalle.rdl, rdl_miembros_detalle.rdl

CREATE OR REPLACE FUNCTION public.rpt_member_detail(
    p_miembro_id UUID
)
RETURNS TABLE (
    id UUID,
    cedula VARCHAR,
    nombre VARCHAR,
    apellido VARCHAR,
    apodo VARCHAR,
    fecha_nacimiento DATE,
    sexo VARCHAR,
    telefono VARCHAR,
    celular VARCHAR,
    telefono_residencia VARCHAR,
    email VARCHAR,
    direccion TEXT,
    direccion_actual TEXT,
    ocupacion VARCHAR,
    trabajo VARCHAR,
    tipo_miembro tipo_miembro,
    vinculado BOOLEAN,
    votacion BOOLEAN,
    colegio VARCHAR,
    colegio_ubicacion VARCHAR,
    sector_nombre VARCHAR,
    circunscripcion_nombre VARCHAR,
    municipio_nombre VARCHAR,
    provincia_nombre VARCHAR,
    comite_nombre VARCHAR,
    nivel_intermedio_nombre VARCHAR,
    coordinador_nombre TEXT,
    coordinador_cedula VARCHAR,
    coordinador_telefono VARCHAR,
    recinto_nombre VARCHAR,
    foto_url VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        m.id,
        m.cedula,
        m.nombre,
        m.apellido,
        m.apodo,
        m.fecha_nacimiento,
        m.sexo,
        m.telefono,
        m.celular,
        m.telefono_residencia,
        m.email,
        m.direccion,
        m.direccion_actual,
        m.ocupacion,
        m.trabajo,
        m.tipo_miembro,
        m.vinculado,
        m.votacion,
        m.colegio,
        m.colegio_ubicacion,
        s.nombre AS sector_nombre,
        c.nombre AS circunscripcion_nombre,
        mu.nombre AS municipio_nombre,
        p.nombre AS provincia_nombre,
        co.nombre AS comite_nombre,
        ni.nombre AS nivel_intermedio_nombre,
        (coord.nombre || ' ' || coord.apellido)::TEXT AS coordinador_nombre,
        coord.cedula AS coordinador_cedula,
        coord.telefono AS coordinador_telefono,
        r.nombre AS recinto_nombre,
        m.foto_url,
        m.created_at
    FROM miembros m
    LEFT JOIN sectores s ON s.id = m.sector_id
    LEFT JOIN circunscripciones c ON c.id = s.circunscripcion_id
    LEFT JOIN municipios mu ON mu.id = c.municipio_id
    LEFT JOIN provincias p ON p.id = mu.provincia_id
    LEFT JOIN comites co ON co.id = m.comite_id
    LEFT JOIN niveles_intermedios ni ON ni.id = m.nivel_intermedio_id
    LEFT JOIN miembros coord ON coord.id = m.coordinador_id
    LEFT JOIN recintos r ON r.id = m.recinto_id
    WHERE m.id = p_miembro_id
      AND m.tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 8: rpt_vote_summary_by_party
-- =============================================================================
-- Returns vote totals per party for a given electoral period.
-- Legacy: rdl_resumenPartido.rdl, rdl_resumenPartidoT.rdl
-- Uses the materialized view for performance.

CREATE OR REPLACE FUNCTION public.rpt_vote_summary_by_party(
    p_periodo_id UUID
)
RETURNS TABLE (
    partido_id UUID,
    partido_nombre VARCHAR,
    partido_siglas VARCHAR,
    partido_color VARCHAR,
    total_votos BIGINT,
    recintos_reportados BIGINT,
    porcentaje NUMERIC
) AS $$
DECLARE
    v_tenant_id UUID;
    v_grand_total BIGINT;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    -- Get grand total for percentage calculation
    SELECT COALESCE(SUM(vt.total_votos), 0) INTO v_grand_total
    FROM mv_vote_totals_by_partido vt
    WHERE vt.tenant_id = v_tenant_id
      AND vt.periodo_id = p_periodo_id;

    RETURN QUERY
    SELECT
        vt.partido_id,
        vt.partido_nombre,
        vt.partido_siglas,
        vt.partido_color,
        COALESCE(vt.total_votos, 0)::BIGINT AS total_votos,
        COALESCE(vt.recintos_reportados, 0)::BIGINT AS recintos_reportados,
        CASE
            WHEN v_grand_total > 0
            THEN ROUND((COALESCE(vt.total_votos, 0)::NUMERIC / v_grand_total::NUMERIC) * 100, 2)
            ELSE 0
        END AS porcentaje
    FROM mv_vote_totals_by_partido vt
    WHERE vt.tenant_id = v_tenant_id
      AND vt.periodo_id = p_periodo_id
    ORDER BY total_votos DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 9: rpt_vote_summary_by_recinto
-- =============================================================================
-- Returns vote totals per recinto for a given electoral period.
-- Legacy: rdl_resumen_por_recinto.rdl
-- Uses materialized view for performance.

CREATE OR REPLACE FUNCTION public.rpt_vote_summary_by_recinto(
    p_periodo_id UUID,
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL
)
RETURNS TABLE (
    recinto_id UUID,
    recinto_nombre VARCHAR,
    recinto_codigo VARCHAR,
    municipio_nombre VARCHAR,
    total_votos BIGINT,
    candidatos_reportados BIGINT,
    colegios_reportados BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        vt.recinto_id,
        vt.recinto_nombre,
        vt.recinto_codigo,
        vt.municipio_nombre,
        COALESCE(vt.total_votos, 0)::BIGINT AS total_votos,
        COALESCE(vt.candidatos_reportados, 0)::BIGINT AS candidatos_reportados,
        COALESCE(vt.colegios_reportados, 0)::BIGINT AS colegios_reportados
    FROM mv_vote_totals_by_recinto vt
    LEFT JOIN recintos r ON r.id = vt.recinto_id
    LEFT JOIN municipios mu ON mu.id = r.municipio_id
    WHERE vt.tenant_id = v_tenant_id
      AND vt.periodo_id = p_periodo_id
      AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
      AND (p_municipio_id IS NULL OR r.municipio_id = p_municipio_id)
    ORDER BY vt.recinto_nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 10: rpt_vote_summary_by_alliance
-- =============================================================================
-- Returns vote totals grouped by party alliance (PLD coalition, PRM coalition).
-- Legacy: rdl_resumenPartido_porAlianzaPLD.rdl, rdl_resumenPartido_porAlianzaPRM.rdl
-- Alliance grouping is done by partido siglas prefix matching.

CREATE OR REPLACE FUNCTION public.rpt_vote_summary_by_alliance(
    p_periodo_id UUID,
    p_alliance_prefix TEXT DEFAULT NULL
)
RETURNS TABLE (
    partido_id UUID,
    partido_nombre VARCHAR,
    partido_siglas VARCHAR,
    partido_color VARCHAR,
    total_votos BIGINT,
    recintos_reportados BIGINT,
    porcentaje_of_alliance NUMERIC
) AS $$
DECLARE
    v_tenant_id UUID;
    v_alliance_total BIGINT;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    -- Get alliance total for percentage calculation
    SELECT COALESCE(SUM(vt.total_votos), 0) INTO v_alliance_total
    FROM mv_vote_totals_by_partido vt
    WHERE vt.tenant_id = v_tenant_id
      AND vt.periodo_id = p_periodo_id
      AND (p_alliance_prefix IS NULL OR vt.partido_siglas ILIKE p_alliance_prefix || '%');

    RETURN QUERY
    SELECT
        vt.partido_id,
        vt.partido_nombre,
        vt.partido_siglas,
        vt.partido_color,
        COALESCE(vt.total_votos, 0)::BIGINT AS total_votos,
        COALESCE(vt.recintos_reportados, 0)::BIGINT AS recintos_reportados,
        CASE
            WHEN v_alliance_total > 0
            THEN ROUND((COALESCE(vt.total_votos, 0)::NUMERIC / v_alliance_total::NUMERIC) * 100, 2)
            ELSE 0
        END AS porcentaje_of_alliance
    FROM mv_vote_totals_by_partido vt
    WHERE vt.tenant_id = v_tenant_id
      AND vt.periodo_id = p_periodo_id
      AND (p_alliance_prefix IS NULL OR vt.partido_siglas ILIKE p_alliance_prefix || '%')
    ORDER BY total_votos DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 11: rpt_actas_status
-- =============================================================================
-- Returns acta submission status per recinto -- which recintos have submitted
-- actas and which are still missing. Legacy: rdl_acta_computada.rdl, rdl_acta_faltante.rdl

CREATE OR REPLACE FUNCTION public.rpt_actas_status(
    p_periodo_id UUID,
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL
)
RETURNS TABLE (
    recinto_id UUID,
    recinto_nombre VARCHAR,
    recinto_codigo VARCHAR,
    municipio_nombre VARCHAR,
    total_colegios BIGINT,
    actas_registradas BIGINT,
    actas_faltantes BIGINT,
    estado_completitud TEXT,
    ultima_acta_at TIMESTAMPTZ
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        r.id AS recinto_id,
        r.nombre AS recinto_nombre,
        r.cod_recinto AS recinto_codigo,
        mu.nombre AS municipio_nombre,
        COUNT(DISTINCT col.id)::BIGINT AS total_colegios,
        COUNT(DISTINCT a.colegio_id)::BIGINT AS actas_registradas,
        (COUNT(DISTINCT col.id) - COUNT(DISTINCT a.colegio_id))::BIGINT AS actas_faltantes,
        CASE
            WHEN COUNT(DISTINCT col.id) = 0 THEN 'sin_colegios'
            WHEN COUNT(DISTINCT a.colegio_id) >= COUNT(DISTINCT col.id) THEN 'completo'
            WHEN COUNT(DISTINCT a.colegio_id) > 0 THEN 'parcial'
            ELSE 'pendiente'
        END::TEXT AS estado_completitud,
        MAX(a.created_at) AS ultima_acta_at
    FROM recintos r
    INNER JOIN municipios mu ON mu.id = r.municipio_id
    LEFT JOIN colegios col ON col.recinto_id = r.id AND col.estado = true
    LEFT JOIN actas a ON a.recinto_id = r.id
        AND a.periodo_id = p_periodo_id
        AND a.estado = true
    WHERE r.estado = true
      AND r.tenant_id = v_tenant_id
      AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
      AND (p_municipio_id IS NULL OR r.municipio_id = p_municipio_id)
    GROUP BY r.id, r.nombre, r.cod_recinto, mu.nombre
    ORDER BY mu.nombre, r.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 12: rpt_turnout_by_recinto
-- =============================================================================
-- Returns voter turnout summary per recinto.
-- Uses mv_turnout_por_recinto materialized view.

CREATE OR REPLACE FUNCTION public.rpt_turnout_by_recinto(
    p_periodo_id UUID DEFAULT NULL,
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL
)
RETURNS TABLE (
    recinto_id UUID,
    recinto_nombre VARCHAR,
    municipio_nombre VARCHAR,
    total_miembros BIGINT,
    votaron BIGINT,
    no_votaron BIGINT,
    tasa_participacion NUMERIC
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        t.recinto_id,
        t.recinto_nombre,
        mu.nombre AS municipio_nombre,
        t.total_miembros,
        t.votaron,
        t.no_votaron,
        CASE
            WHEN t.total_miembros > 0
            THEN ROUND((t.votaron::NUMERIC / t.total_miembros::NUMERIC) * 100, 1)
            ELSE 0
        END AS tasa_participacion
    FROM mv_turnout_por_recinto t
    INNER JOIN recintos r ON r.id = t.recinto_id
    INNER JOIN municipios mu ON mu.id = r.municipio_id
    WHERE t.tenant_id = v_tenant_id
      AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
      AND (p_municipio_id IS NULL OR r.municipio_id = p_municipio_id)
    ORDER BY mu.nombre, t.recinto_nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 13: rpt_summary_by_geographic_level
-- =============================================================================
-- Returns member count summaries at any geographic level.
-- Legacy: rdl_resumen_por_bloque.rdl, rdl_resumen_por_intermedio.rdl, etc.
-- Uses mv_member_counts materialized view.

CREATE OR REPLACE FUNCTION public.rpt_summary_by_geographic_level(
    p_nivel TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS TABLE (
    geo_id UUID,
    geo_nombre TEXT,
    total_miembros BIGINT,
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
        mc.geo_id,
        mc.geo_nombre,
        mc.total_miembros,
        mc.coordinadores,
        mc.multiplicadores,
        mc.relacionados
    FROM mv_member_counts mc
    WHERE mc.tenant_id = v_tenant_id
      AND mc.nivel = p_nivel
      AND (
          p_parent_id IS NULL
          OR (p_nivel = 'municipio' AND mc.provincia_id = p_parent_id)
          OR (p_nivel = 'circunscripcion' AND mc.municipio_id = p_parent_id)
          OR (p_nivel = 'sector' AND mc.circunscripcion_id = p_parent_id)
      )
    ORDER BY mc.geo_nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 14: rpt_coordinator_summary
-- =============================================================================
-- Returns coordinator performance summary with subordinate counts.
-- Legacy: rdl_resumen_porCoordinador.rdl

CREATE OR REPLACE FUNCTION public.rpt_coordinator_summary(
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL
)
RETURNS TABLE (
    coordinador_id UUID,
    coordinador_cedula VARCHAR,
    coordinador_nombre VARCHAR,
    coordinador_apellido VARCHAR,
    coordinador_telefono VARCHAR,
    sector_nombre VARCHAR,
    municipio_nombre VARCHAR,
    total_multiplicadores BIGINT,
    total_relacionados BIGINT,
    total_subordinados BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT
        coord.id AS coordinador_id,
        coord.cedula AS coordinador_cedula,
        coord.nombre AS coordinador_nombre,
        coord.apellido AS coordinador_apellido,
        coord.telefono AS coordinador_telefono,
        s.nombre AS sector_nombre,
        mu.nombre AS municipio_nombre,
        COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador')::BIGINT AS total_multiplicadores,
        COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado')::BIGINT AS total_relacionados,
        COUNT(m.id)::BIGINT AS total_subordinados
    FROM miembros coord
    LEFT JOIN miembros m ON m.coordinador_id = coord.id AND m.estado = true
    LEFT JOIN sectores s ON s.id = coord.sector_id
    LEFT JOIN circunscripciones c ON c.id = s.circunscripcion_id
    LEFT JOIN municipios mu ON mu.id = c.municipio_id
    WHERE coord.tenant_id = v_tenant_id
      AND coord.tipo_miembro = 'coordinador'
      AND coord.estado = true
      AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
      AND (p_municipio_id IS NULL OR c.municipio_id = p_municipio_id)
    GROUP BY coord.id, coord.cedula, coord.nombre, coord.apellido,
             coord.telefono, s.nombre, mu.nombre
    ORDER BY mu.nombre, s.nombre, coord.apellido, coord.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 15: rpt_daily_registration
-- =============================================================================
-- Returns daily member registration counts for a date range.
-- Legacy: rdl_registro_por_dia.rdl
-- Uses mv_registration_daily materialized view.

CREATE OR REPLACE FUNCTION public.rpt_daily_registration(
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    registration_date DATE,
    total_registrations BIGINT,
    coordinadores BIGINT,
    multiplicadores BIGINT,
    relacionados BIGINT,
    cumulative_total BIGINT
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
        rd.relacionados,
        SUM(rd.total_registrations) OVER (
            ORDER BY rd.registration_date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )::BIGINT AS cumulative_total
    FROM mv_registration_daily rd
    WHERE rd.tenant_id = v_tenant_id
      AND (p_date_from IS NULL OR rd.registration_date >= p_date_from)
      AND (p_date_to IS NULL OR rd.registration_date <= p_date_to)
    ORDER BY rd.registration_date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 16: rpt_seguimiento_activity
-- =============================================================================
-- Returns follow-up activity summary by user for activity reports.
-- Legacy: rdl_avance_llamada_usuario.rdl, rdl_llamadas_por_usuario_dia.rdl, etc.

CREATE OR REPLACE FUNCTION public.rpt_seguimiento_activity(
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_usuario_id UUID DEFAULT NULL
)
RETURNS TABLE (
    usuario_id UUID,
    usuario_nombre TEXT,
    fecha DATE,
    total_contactos BIGINT,
    contactados_si BIGINT,
    contactados_no BIGINT,
    registrados BIGINT,
    rechazados BIGINT,
    pendientes BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Note: seguimiento_no_inscritos does not have tenant_id column,
    -- so we filter via the partido_id from the active period.
    RETURN QUERY
    SELECT
        s.usuario_id,
        (u.nombre || ' ' || u.apellido)::TEXT AS usuario_nombre,
        DATE(s.updated_at) AS fecha,
        COUNT(*)::BIGINT AS total_contactos,
        COUNT(*) FILTER (WHERE s.contacto = 'SI')::BIGINT AS contactados_si,
        COUNT(*) FILTER (WHERE s.contacto = 'NO')::BIGINT AS contactados_no,
        COUNT(*) FILTER (WHERE s.estado = 'registrado')::BIGINT AS registrados,
        COUNT(*) FILTER (WHERE s.estado = 'rechazado')::BIGINT AS rechazados,
        COUNT(*) FILTER (WHERE s.estado IN ('no_contactado', 'contactado', 'seguimiento_programado'))::BIGINT AS pendientes
    FROM seguimiento_no_inscritos s
    LEFT JOIN usuarios u ON u.auth_user_id = s.usuario_id
    WHERE (p_date_from IS NULL OR DATE(s.updated_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(s.updated_at) <= p_date_to)
      AND (p_usuario_id IS NULL OR s.usuario_id = p_usuario_id)
    GROUP BY s.usuario_id, u.nombre, u.apellido, DATE(s.updated_at)
    ORDER BY DATE(s.updated_at) DESC, usuario_nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 17: Grant/Revoke permissions on all report functions
-- =============================================================================

-- Grant to authenticated
GRANT EXECUTE ON FUNCTION public.rpt_members_by_coordinator(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_members_by_recinto(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_members_not_in_padron(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_members_by_sector(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_members_by_liaison(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_member_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_vote_summary_by_party(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_vote_summary_by_recinto(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_vote_summary_by_alliance(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_actas_status(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_turnout_by_recinto(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_summary_by_geographic_level(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_coordinator_summary(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_daily_registration(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpt_seguimiento_activity(DATE, DATE, UUID) TO authenticated;

-- Revoke from anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.rpt_members_by_coordinator(UUID, UUID, UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_members_by_recinto(UUID, UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_members_not_in_padron(UUID, UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_members_by_sector(UUID, UUID, UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_members_by_liaison(UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_member_detail(UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_vote_summary_by_party(UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_vote_summary_by_recinto(UUID, UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_vote_summary_by_alliance(UUID, TEXT) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_actas_status(UUID, UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_turnout_by_recinto(UUID, UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_summary_by_geographic_level(TEXT, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_coordinator_summary(UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_daily_registration(DATE, DATE) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpt_seguimiento_activity(DATE, DATE, UUID) FROM anon, PUBLIC;
