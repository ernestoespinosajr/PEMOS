-- =============================================================================
-- Migration: 20260410000007_td010_td015_tech_debt_remediation.sql
-- =============================================================================
-- Fixes two medium-severity tech debt items from tckt-001:
--
--   TD-010: Dashboard turnout endpoint missing periodo_id filter.
--     Creates rpc_dashboard_turnout(UUID, UUID) to compute turnout per recinto
--     scoped by periodo_id, following the pattern of rpc_dashboard_vote_summary,
--     rpc_dashboard_timeline, and rpc_dashboard_by_party.
--
--   TD-015: rpt_seguimiento_activity RPC declares v_tenant_id but never uses it.
--     Replaces the function with a corrected version that joins through partidos
--     to enforce tenant isolation, matching the pattern used by all other
--     reporting RPC functions.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.rpc_dashboard_turnout(UUID, UUID);
--   -- For rpt_seguimiento_activity, restore the original version from
--   -- 20260410000004_reporting_system_rpc.sql (lines 942-983).
-- =============================================================================


-- =============================================================================
-- STEP 1: rpc_dashboard_turnout — periodo-scoped turnout for dashboard
-- =============================================================================
-- Returns turnout statistics per recinto for a given electoral period.
-- "Turnout" for a recinto in a period = whether any candidato_votos records
-- exist with votos > 0 for that recinto+period, compared against total
-- members assigned to that recinto.
--
-- This replaces the direct query against mv_turnout_por_recinto (which has
-- no periodo_id dimension) for the dashboard endpoint.

CREATE OR REPLACE FUNCTION public.rpc_dashboard_turnout(
    p_periodo_id UUID,
    p_recinto_id UUID DEFAULT NULL
)
RETURNS TABLE (
    recinto_id UUID,
    recinto_nombre VARCHAR,
    total_miembros BIGINT,
    votaron BIGINT,
    no_votaron BIGINT,
    porcentaje INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH recinto_members AS (
        -- Count active members per recinto
        SELECT
            r.id AS rid,
            r.nombre AS rname,
            COUNT(m.id)::BIGINT AS total_members
        FROM recintos r
        LEFT JOIN miembros m ON m.recinto_id = r.id AND m.estado = true
        WHERE r.estado = true
          AND (p_recinto_id IS NULL OR r.id = p_recinto_id)
        GROUP BY r.id, r.nombre
        HAVING COUNT(m.id) > 0
    ),
    recinto_votes AS (
        -- Count distinct members who have vote records with votos > 0
        -- for this period in each recinto (via candidato_votos)
        SELECT
            cv.recinto_id AS rid,
            COUNT(DISTINCT cv.updated_by)::BIGINT AS reporters
        FROM candidato_votos cv
        WHERE cv.periodo_id = p_periodo_id
          AND cv.estado = true
          AND cv.votos > 0
          AND (p_recinto_id IS NULL OR cv.recinto_id = p_recinto_id)
        GROUP BY cv.recinto_id
    )
    SELECT
        rm.rid AS recinto_id,
        rm.rname AS recinto_nombre,
        rm.total_members AS total_miembros,
        COALESCE(rv.reporters, 0)::BIGINT AS votaron,
        (rm.total_members - COALESCE(rv.reporters, 0))::BIGINT AS no_votaron,
        CASE
            WHEN rm.total_members > 0
            THEN (COALESCE(rv.reporters, 0) * 100 / rm.total_members)::INTEGER
            ELSE 0
        END AS porcentaje
    FROM recinto_members rm
    LEFT JOIN recinto_votes rv ON rv.rid = rm.rid
    ORDER BY rm.rname;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Grant to authenticated, revoke from anon/PUBLIC (matching existing pattern)
REVOKE EXECUTE ON FUNCTION public.rpc_dashboard_turnout(UUID, UUID) FROM anon, PUBLIC;


-- =============================================================================
-- STEP 2: Fix rpt_seguimiento_activity — add tenant isolation
-- =============================================================================
-- The original function (from 20260410000004) declares v_tenant_id but never
-- uses it. This replacement adds a JOIN through partidos to enforce tenant
-- scoping, matching the pattern used by rpt_coordinator_summary,
-- rpt_daily_registration, and all other reporting RPCs.

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
    -- Retrieve the calling user's tenant from JWT claims
    v_tenant_id := public.get_my_tenant_id();

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
    -- Enforce tenant isolation through partidos table
    JOIN partidos pt ON pt.id = s.partido_id AND pt.tenant_id = v_tenant_id
    LEFT JOIN usuarios u ON u.auth_user_id = s.usuario_id
    WHERE (p_date_from IS NULL OR DATE(s.updated_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(s.updated_at) <= p_date_to)
      AND (p_usuario_id IS NULL OR s.usuario_id = p_usuario_id)
    GROUP BY s.usuario_id, u.nombre, u.apellido, DATE(s.updated_at)
    ORDER BY DATE(s.updated_at) DESC, usuario_nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Permissions remain unchanged — the original GRANT/REVOKE from
-- 20260410000004 still applies since the function signature is identical.
