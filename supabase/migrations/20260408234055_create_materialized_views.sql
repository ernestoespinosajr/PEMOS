-- =============================================================================
-- Migration: Create Materialized Views and Refresh Function
-- =============================================================================
-- Pre-computed aggregations for dashboard performance. These views avoid
-- expensive live aggregation queries on large tables.
--
-- Views:
--   1. mv_member_count_by_provincia  - Member counts grouped by province
--   2. mv_member_count_by_municipio  - Member counts grouped by municipality
--   3. mv_vote_totals_by_partido     - Vote totals grouped by party
--   4. mv_vote_totals_by_recinto     - Vote totals grouped by polling station
--
-- The refresh_materialized_views() function refreshes all views and can
-- be called from Edge Functions, cron jobs, or manually.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS refresh_materialized_views();
--   DROP MATERIALIZED VIEW IF EXISTS mv_vote_totals_by_recinto;
--   DROP MATERIALIZED VIEW IF EXISTS mv_vote_totals_by_partido;
--   DROP MATERIALIZED VIEW IF EXISTS mv_member_count_by_municipio;
--   DROP MATERIALIZED VIEW IF EXISTS mv_member_count_by_provincia;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Materialized View: mv_member_count_by_provincia
-- ---------------------------------------------------------------------------
-- Counts active members per province, joining through the geographic
-- hierarchy (miembros -> sectores -> circunscripciones -> municipios -> provincias).
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_member_count_by_provincia AS
SELECT
    p.id AS provincia_id,
    p.nombre AS provincia_nombre,
    p.codigo AS provincia_codigo,
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
GROUP BY p.id, p.nombre, p.codigo, p.tenant_id;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_member_count_provincia_id
    ON mv_member_count_by_provincia(provincia_id, tenant_id);

-- ---------------------------------------------------------------------------
-- Materialized View: mv_member_count_by_municipio
-- ---------------------------------------------------------------------------
-- Counts active members per municipality.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_member_count_by_municipio AS
SELECT
    mu.id AS municipio_id,
    mu.nombre AS municipio_nombre,
    mu.codigo AS municipio_codigo,
    mu.provincia_id,
    p.nombre AS provincia_nombre,
    mu.tenant_id,
    COUNT(m.id) AS total_miembros,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador') AS coordinadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador') AS multiplicadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado') AS relacionados
FROM municipios mu
INNER JOIN provincias p ON p.id = mu.provincia_id
LEFT JOIN circunscripciones c ON c.municipio_id = mu.id
LEFT JOIN sectores s ON s.circunscripcion_id = c.id
LEFT JOIN miembros m ON m.sector_id = s.id AND m.estado = true
WHERE mu.estado = true
GROUP BY mu.id, mu.nombre, mu.codigo, mu.provincia_id, p.nombre, mu.tenant_id;

CREATE UNIQUE INDEX idx_mv_member_count_municipio_id
    ON mv_member_count_by_municipio(municipio_id, tenant_id);

-- ---------------------------------------------------------------------------
-- Materialized View: mv_vote_totals_by_partido
-- ---------------------------------------------------------------------------
-- Total votes per party across all electoral periods and recintos.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_vote_totals_by_partido AS
SELECT
    pa.id AS partido_id,
    pa.nombre AS partido_nombre,
    pa.siglas AS partido_siglas,
    pa.color AS partido_color,
    v.periodo_electoral,
    pa.tenant_id,
    COUNT(DISTINCT v.recinto_id) AS recintos_reportados,
    SUM(cv.votos) AS total_votos
FROM partidos pa
LEFT JOIN candidatos ca ON ca.partido_id = pa.id AND ca.estado = true
LEFT JOIN candidato_votos cv ON cv.candidato_id = ca.id
LEFT JOIN votaciones v ON v.id = cv.votacion_id AND v.estado = true
WHERE pa.estado = true
GROUP BY pa.id, pa.nombre, pa.siglas, pa.color, v.periodo_electoral, pa.tenant_id;

CREATE UNIQUE INDEX idx_mv_vote_totals_partido_id
    ON mv_vote_totals_by_partido(partido_id, periodo_electoral, tenant_id);

-- ---------------------------------------------------------------------------
-- Materialized View: mv_vote_totals_by_recinto
-- ---------------------------------------------------------------------------
-- Vote totals per polling station for each electoral period.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_vote_totals_by_recinto AS
SELECT
    r.id AS recinto_id,
    r.nombre AS recinto_nombre,
    r.codigo AS recinto_codigo,
    r.municipio_id,
    mu.nombre AS municipio_nombre,
    v.periodo_electoral,
    r.tenant_id,
    SUM(v.opcion_01) AS total_opcion_01,
    SUM(v.opcion_02) AS total_opcion_02,
    SUM(v.opcion_03) AS total_opcion_03,
    SUM(v.opcion_01 + v.opcion_02 + v.opcion_03) AS total_votos,
    COUNT(v.id) AS registros_votacion
FROM recintos r
LEFT JOIN municipios mu ON mu.id = r.municipio_id
LEFT JOIN votaciones v ON v.recinto_id = r.id AND v.estado = true
WHERE r.estado = true
GROUP BY r.id, r.nombre, r.codigo, r.municipio_id, mu.nombre, v.periodo_electoral, r.tenant_id;

CREATE UNIQUE INDEX idx_mv_vote_totals_recinto_id
    ON mv_vote_totals_by_recinto(recinto_id, periodo_electoral, tenant_id);

-- =============================================================================
-- Function: refresh_materialized_views()
-- =============================================================================
-- Refreshes all materialized views. Uses CONCURRENTLY where possible
-- (requires unique index on the view, which we have created above).
-- Can be called from Edge Functions, pg_cron, or manually:
--   SELECT refresh_materialized_views();
-- =============================================================================
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_provincia;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_municipio;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_partido;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_recinto;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
