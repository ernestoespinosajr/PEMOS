-- =============================================================================
-- Migration: Electoral Quality Remediation (ftr-006 Quality Review)
-- =============================================================================
-- Addresses Issue #1 from Quinn's quality review: partido_votos table's
-- candidato_N_votos columns (1 through 6) lack CHECK (>= 0) constraints.
--
-- The candidato_votos.votos column already has CHECK (votos >= 0), but the
-- derived aggregation columns in partido_votos do not. A bug in aggregation
-- logic could insert negative values without database-level protection.
--
-- Also adds two RPC functions for the dashboard endpoints to use database-level
-- aggregation instead of fetching all rows to JS:
--   - rpc_dashboard_vote_summary: SUM(votos) and COUNT(DISTINCT recinto_id)
--   - rpc_dashboard_timeline: date_trunc GROUP BY bucketing for vote timeline
--   - rpc_dashboard_by_party: GROUP BY partido aggregation with geo filters
--
-- Rollback:
--   DROP FUNCTION IF EXISTS rpc_dashboard_by_party(UUID, UUID, UUID, UUID);
--   DROP FUNCTION IF EXISTS rpc_dashboard_timeline(UUID, INTEGER);
--   DROP FUNCTION IF EXISTS rpc_dashboard_vote_summary(UUID);
--   ALTER TABLE partido_votos DROP CONSTRAINT IF EXISTS chk_candidato_1_votos_non_negative;
--   ALTER TABLE partido_votos DROP CONSTRAINT IF EXISTS chk_candidato_2_votos_non_negative;
--   ALTER TABLE partido_votos DROP CONSTRAINT IF EXISTS chk_candidato_3_votos_non_negative;
--   ALTER TABLE partido_votos DROP CONSTRAINT IF EXISTS chk_candidato_4_votos_non_negative;
--   ALTER TABLE partido_votos DROP CONSTRAINT IF EXISTS chk_candidato_5_votos_non_negative;
--   ALTER TABLE partido_votos DROP CONSTRAINT IF EXISTS chk_candidato_6_votos_non_negative;
-- =============================================================================


-- =============================================================================
-- STEP 1: Add CHECK constraints to partido_votos vote columns
-- =============================================================================

ALTER TABLE partido_votos
  ADD CONSTRAINT chk_candidato_1_votos_non_negative CHECK (candidato_1_votos >= 0);

ALTER TABLE partido_votos
  ADD CONSTRAINT chk_candidato_2_votos_non_negative CHECK (candidato_2_votos >= 0);

ALTER TABLE partido_votos
  ADD CONSTRAINT chk_candidato_3_votos_non_negative CHECK (candidato_3_votos >= 0);

ALTER TABLE partido_votos
  ADD CONSTRAINT chk_candidato_4_votos_non_negative CHECK (candidato_4_votos >= 0);

ALTER TABLE partido_votos
  ADD CONSTRAINT chk_candidato_5_votos_non_negative CHECK (candidato_5_votos >= 0);

ALTER TABLE partido_votos
  ADD CONSTRAINT chk_candidato_6_votos_non_negative CHECK (candidato_6_votos >= 0);


-- =============================================================================
-- STEP 2: RPC function for dashboard summary (replaces JS summation)
-- =============================================================================
-- Returns total_votos (SUM) and recintos_reportados (COUNT DISTINCT) in a
-- single database round-trip instead of fetching all rows to the client.

CREATE OR REPLACE FUNCTION rpc_dashboard_vote_summary(p_periodo_id UUID)
RETURNS TABLE (
  total_votos BIGINT,
  recintos_reportados BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(cv.votos), 0)::BIGINT AS total_votos,
    COUNT(DISTINCT CASE WHEN cv.votos > 0 THEN cv.recinto_id END)::BIGINT AS recintos_reportados
  FROM candidato_votos cv
  WHERE cv.periodo_id = p_periodo_id
    AND cv.estado = true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 3: RPC function for dashboard timeline (replaces JS bucketing)
-- =============================================================================
-- Buckets candidato_votos by updated_at and actas by created_at using
-- date_trunc at the database level, returning cumulative totals.

CREATE OR REPLACE FUNCTION rpc_dashboard_timeline(
  p_periodo_id UUID,
  p_interval_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
  bucket TIMESTAMPTZ,
  bucket_votos BIGINT,
  bucket_actas BIGINT
) AS $$
DECLARE
  v_interval INTERVAL;
BEGIN
  v_interval := (p_interval_minutes || ' minutes')::INTERVAL;

  RETURN QUERY
  WITH vote_buckets AS (
    SELECT
      to_timestamp(
        floor(extract(epoch FROM cv.updated_at) / (p_interval_minutes * 60)) * (p_interval_minutes * 60)
      ) AS ts,
      SUM(cv.votos) AS votos
    FROM candidato_votos cv
    WHERE cv.periodo_id = p_periodo_id
      AND cv.estado = true
      AND cv.votos > 0
    GROUP BY ts
  ),
  acta_buckets AS (
    SELECT
      to_timestamp(
        floor(extract(epoch FROM a.created_at) / (p_interval_minutes * 60)) * (p_interval_minutes * 60)
      ) AS ts,
      COUNT(*) AS cnt
    FROM actas a
    WHERE a.periodo_id = p_periodo_id
      AND a.estado = true
    GROUP BY ts
  ),
  all_buckets AS (
    SELECT ts FROM vote_buckets
    UNION
    SELECT ts FROM acta_buckets
  )
  SELECT
    ab.ts AS bucket,
    COALESCE(vb.votos, 0)::BIGINT AS bucket_votos,
    COALESCE(acb.cnt, 0)::BIGINT AS bucket_actas
  FROM all_buckets ab
  LEFT JOIN vote_buckets vb ON vb.ts = ab.ts
  LEFT JOIN acta_buckets acb ON acb.ts = ab.ts
  ORDER BY ab.ts;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 4: RPC function for dashboard by-party (replaces JS aggregation)
-- =============================================================================
-- Aggregates votes by party at the database level with optional geographic
-- filters (circunscripcion_id, municipio_id, recinto_id).

CREATE OR REPLACE FUNCTION rpc_dashboard_by_party(
  p_periodo_id UUID,
  p_circunscripcion_id UUID DEFAULT NULL,
  p_municipio_id UUID DEFAULT NULL,
  p_recinto_id UUID DEFAULT NULL
)
RETURNS TABLE (
  partido_id UUID,
  partido_nombre VARCHAR,
  partido_siglas VARCHAR,
  partido_color VARCHAR,
  total_votos BIGINT,
  recintos_reportados BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.id AS partido_id,
    pa.nombre AS partido_nombre,
    pa.siglas AS partido_siglas,
    pa.color AS partido_color,
    COALESCE(SUM(cv.votos), 0)::BIGINT AS total_votos,
    COUNT(DISTINCT CASE WHEN cv.votos > 0 THEN cv.recinto_id END)::BIGINT AS recintos_reportados
  FROM partidos pa
  JOIN candidatos ca ON ca.partido_id = pa.id AND ca.estado = true
  JOIN candidato_votos cv ON cv.candidato_id = ca.id AND cv.estado = true
  JOIN recintos r ON r.id = cv.recinto_id
  WHERE cv.periodo_id = p_periodo_id
    AND pa.estado = true
    AND (p_circunscripcion_id IS NULL OR r.circunscripcion_id = p_circunscripcion_id)
    AND (p_municipio_id IS NULL OR r.municipio_id = p_municipio_id)
    AND (p_recinto_id IS NULL OR cv.recinto_id = p_recinto_id)
  GROUP BY pa.id, pa.nombre, pa.siglas, pa.color
  ORDER BY total_votos DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 5: Revoke anon/public access on new functions
-- =============================================================================

REVOKE EXECUTE ON FUNCTION rpc_dashboard_vote_summary(UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION rpc_dashboard_timeline(UUID, INTEGER) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION rpc_dashboard_by_party(UUID, UUID, UUID, UUID) FROM anon, PUBLIC;
