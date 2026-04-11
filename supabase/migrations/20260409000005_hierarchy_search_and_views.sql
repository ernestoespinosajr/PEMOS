-- =============================================================================
-- Migration: Hierarchy Search Function & Extended Materialized Views
-- =============================================================================
-- Adds cross-level hierarchy search, additional materialized views for
-- circunscripcion/sector/comite member counts, and a function to fetch
-- children of a geographic entity with member counts.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_hierarchy_children(TEXT, UUID);
--   DROP FUNCTION IF EXISTS public.search_hierarchy(TEXT);
--   DROP FUNCTION IF EXISTS refresh_materialized_views();  -- recreate old version
--   DROP MATERIALIZED VIEW IF EXISTS mv_member_count_by_comite;
--   DROP MATERIALIZED VIEW IF EXISTS mv_member_count_by_sector;
--   DROP MATERIALIZED VIEW IF EXISTS mv_member_count_by_circunscripcion;
--   -- Then recreate refresh_materialized_views() with original 4 views only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Materialized View: mv_member_count_by_circunscripcion
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_member_count_by_circunscripcion AS
SELECT
    c.id AS circunscripcion_id,
    c.nombre AS circunscripcion_nombre,
    c.numero AS circunscripcion_numero,
    c.municipio_id,
    mu.nombre AS municipio_nombre,
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
GROUP BY c.id, c.nombre, c.numero, c.municipio_id, mu.nombre, c.tenant_id;

CREATE UNIQUE INDEX idx_mv_member_count_circunscripcion_id
    ON mv_member_count_by_circunscripcion(circunscripcion_id, tenant_id);

-- ---------------------------------------------------------------------------
-- 2. Materialized View: mv_member_count_by_sector
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_member_count_by_sector AS
SELECT
    s.id AS sector_id,
    s.nombre AS sector_nombre,
    s.codigo AS sector_codigo,
    s.circunscripcion_id,
    c.nombre AS circunscripcion_nombre,
    s.tenant_id,
    COUNT(m.id) AS total_miembros,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador') AS coordinadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador') AS multiplicadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado') AS relacionados
FROM sectores s
INNER JOIN circunscripciones c ON c.id = s.circunscripcion_id
LEFT JOIN miembros m ON m.sector_id = s.id AND m.estado = true
WHERE s.estado = true
GROUP BY s.id, s.nombre, s.codigo, s.circunscripcion_id, c.nombre, s.tenant_id;

CREATE UNIQUE INDEX idx_mv_member_count_sector_id
    ON mv_member_count_by_sector(sector_id, tenant_id);

-- ---------------------------------------------------------------------------
-- 3. Materialized View: mv_member_count_by_comite
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_member_count_by_comite AS
SELECT
    co.id AS comite_id,
    co.nombre AS comite_nombre,
    co.codigo AS comite_codigo,
    co.sector_id,
    s.nombre AS sector_nombre,
    co.tenant_id,
    COUNT(m.id) AS total_miembros,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador') AS coordinadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador') AS multiplicadores,
    COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado') AS relacionados
FROM comites co
INNER JOIN sectores s ON s.id = co.sector_id
LEFT JOIN miembros m ON m.comite_id = co.id AND m.estado = true
WHERE co.estado = true
GROUP BY co.id, co.nombre, co.codigo, co.sector_id, s.nombre, co.tenant_id;

CREATE UNIQUE INDEX idx_mv_member_count_comite_id
    ON mv_member_count_by_comite(comite_id, tenant_id);

-- ---------------------------------------------------------------------------
-- 4. Update refresh_materialized_views() to include new views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_provincia;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_municipio;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_circunscripcion;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_sector;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_count_by_comite;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_partido;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vote_totals_by_recinto;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 5. Cross-level search function
-- ---------------------------------------------------------------------------
-- Searches all 6 geographic levels by name or code. Returns up to 50 results
-- ordered by level then name. Uses ILIKE for case-insensitive partial matching.
-- SECURITY DEFINER so RLS on the underlying tables does not block the function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_hierarchy(search_term TEXT)
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    codigo TEXT,
    nivel TEXT,
    parent_nombre TEXT
) AS $$
BEGIN
    RETURN QUERY

    -- Provincias (level 1, no parent)
    SELECT
        p.id,
        p.nombre::TEXT,
        p.codigo::TEXT,
        'provincia'::TEXT,
        NULL::TEXT
    FROM provincias p
    WHERE p.estado = true
      AND (p.nombre ILIKE '%' || search_term || '%'
           OR p.codigo ILIKE '%' || search_term || '%')

    UNION ALL

    -- Municipios (level 2, parent = provincia)
    SELECT
        mu.id,
        mu.nombre::TEXT,
        mu.codigo::TEXT,
        'municipio'::TEXT,
        pr.nombre::TEXT
    FROM municipios mu
    INNER JOIN provincias pr ON pr.id = mu.provincia_id
    WHERE mu.estado = true
      AND (mu.nombre ILIKE '%' || search_term || '%'
           OR mu.codigo ILIKE '%' || search_term || '%')

    UNION ALL

    -- Circunscripciones (level 3, parent = municipio)
    -- Note: circunscripciones use 'numero' (INTEGER) instead of 'codigo'
    SELECT
        c.id,
        c.nombre::TEXT,
        c.numero::TEXT,
        'circunscripcion'::TEXT,
        mu2.nombre::TEXT
    FROM circunscripciones c
    INNER JOIN municipios mu2 ON mu2.id = c.municipio_id
    WHERE c.estado = true
      AND (c.nombre ILIKE '%' || search_term || '%'
           OR c.numero::TEXT ILIKE '%' || search_term || '%')

    UNION ALL

    -- Sectores (level 4, parent = circunscripcion)
    SELECT
        s.id,
        s.nombre::TEXT,
        s.codigo::TEXT,
        'sector'::TEXT,
        c2.nombre::TEXT
    FROM sectores s
    INNER JOIN circunscripciones c2 ON c2.id = s.circunscripcion_id
    WHERE s.estado = true
      AND (s.nombre ILIKE '%' || search_term || '%'
           OR s.codigo ILIKE '%' || search_term || '%')

    UNION ALL

    -- Comites (level 5, parent = sector)
    SELECT
        co.id,
        co.nombre::TEXT,
        co.codigo::TEXT,
        'comite'::TEXT,
        se.nombre::TEXT
    FROM comites co
    INNER JOIN sectores se ON se.id = co.sector_id
    WHERE co.estado = true
      AND (co.nombre ILIKE '%' || search_term || '%'
           OR co.codigo ILIKE '%' || search_term || '%')

    UNION ALL

    -- Niveles intermedios (level 6, parent = comite)
    SELECT
        ni.id,
        ni.nombre::TEXT,
        ni.codigo::TEXT,
        'nivel_intermedio'::TEXT,
        com.nombre::TEXT
    FROM niveles_intermedios ni
    INNER JOIN comites com ON com.id = ni.comite_id
    WHERE ni.estado = true
      AND (ni.nombre ILIKE '%' || search_term || '%'
           OR ni.codigo ILIKE '%' || search_term || '%')

    ORDER BY nivel, nombre
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Grant to authenticated users only
GRANT EXECUTE ON FUNCTION public.search_hierarchy(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.search_hierarchy(TEXT) FROM anon, public;

-- ---------------------------------------------------------------------------
-- 6. Get hierarchy children with member counts
-- ---------------------------------------------------------------------------
-- Given a level name and optional parent_id, returns children at the next
-- level with member counts from materialized views.
--
-- Usage:
--   SELECT * FROM get_hierarchy_children('provincia', NULL);  -- all provincias
--   SELECT * FROM get_hierarchy_children('municipio', '<provincia_uuid>');
--   SELECT * FROM get_hierarchy_children('circunscripcion', '<municipio_uuid>');
--   SELECT * FROM get_hierarchy_children('sector', '<circunscripcion_uuid>');
--   SELECT * FROM get_hierarchy_children('comite', '<sector_uuid>');
--   SELECT * FROM get_hierarchy_children('nivel_intermedio', '<comite_uuid>');
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hierarchy_children(
    target_level TEXT,
    parent_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    codigo TEXT,
    estado BOOLEAN,
    total_miembros BIGINT,
    coordinadores BIGINT,
    multiplicadores BIGINT,
    relacionados BIGINT
) AS $$
BEGIN
    IF target_level = 'provincia' THEN
        RETURN QUERY
        SELECT
            p.id,
            p.nombre::TEXT,
            p.codigo::TEXT,
            p.estado,
            COALESCE(mv.total_miembros, 0)::BIGINT,
            COALESCE(mv.coordinadores, 0)::BIGINT,
            COALESCE(mv.multiplicadores, 0)::BIGINT,
            COALESCE(mv.relacionados, 0)::BIGINT
        FROM provincias p
        LEFT JOIN mv_member_count_by_provincia mv ON mv.provincia_id = p.id
        WHERE p.estado = true
        ORDER BY p.nombre;

    ELSIF target_level = 'municipio' THEN
        RETURN QUERY
        SELECT
            mu.id,
            mu.nombre::TEXT,
            mu.codigo::TEXT,
            mu.estado,
            COALESCE(mv.total_miembros, 0)::BIGINT,
            COALESCE(mv.coordinadores, 0)::BIGINT,
            COALESCE(mv.multiplicadores, 0)::BIGINT,
            COALESCE(mv.relacionados, 0)::BIGINT
        FROM municipios mu
        LEFT JOIN mv_member_count_by_municipio mv ON mv.municipio_id = mu.id
        WHERE mu.estado = true
          AND (parent_id IS NULL OR mu.provincia_id = parent_id)
        ORDER BY mu.nombre;

    ELSIF target_level = 'circunscripcion' THEN
        RETURN QUERY
        SELECT
            c.id,
            c.nombre::TEXT,
            c.numero::TEXT,
            c.estado,
            COALESCE(mv.total_miembros, 0)::BIGINT,
            COALESCE(mv.coordinadores, 0)::BIGINT,
            COALESCE(mv.multiplicadores, 0)::BIGINT,
            COALESCE(mv.relacionados, 0)::BIGINT
        FROM circunscripciones c
        LEFT JOIN mv_member_count_by_circunscripcion mv ON mv.circunscripcion_id = c.id
        WHERE c.estado = true
          AND (parent_id IS NULL OR c.municipio_id = parent_id)
        ORDER BY c.nombre;

    ELSIF target_level = 'sector' THEN
        RETURN QUERY
        SELECT
            s.id,
            s.nombre::TEXT,
            s.codigo::TEXT,
            s.estado,
            COALESCE(mv.total_miembros, 0)::BIGINT,
            COALESCE(mv.coordinadores, 0)::BIGINT,
            COALESCE(mv.multiplicadores, 0)::BIGINT,
            COALESCE(mv.relacionados, 0)::BIGINT
        FROM sectores s
        LEFT JOIN mv_member_count_by_sector mv ON mv.sector_id = s.id
        WHERE s.estado = true
          AND (parent_id IS NULL OR s.circunscripcion_id = parent_id)
        ORDER BY s.nombre;

    ELSIF target_level = 'comite' THEN
        RETURN QUERY
        SELECT
            co.id,
            co.nombre::TEXT,
            co.codigo::TEXT,
            co.estado,
            COALESCE(mv.total_miembros, 0)::BIGINT,
            COALESCE(mv.coordinadores, 0)::BIGINT,
            COALESCE(mv.multiplicadores, 0)::BIGINT,
            COALESCE(mv.relacionados, 0)::BIGINT
        FROM comites co
        LEFT JOIN mv_member_count_by_comite mv ON mv.comite_id = co.id
        WHERE co.estado = true
          AND (parent_id IS NULL OR co.sector_id = parent_id)
        ORDER BY co.nombre;

    ELSIF target_level = 'nivel_intermedio' THEN
        -- No materialized view for niveles_intermedios; use direct count
        RETURN QUERY
        SELECT
            ni.id,
            ni.nombre::TEXT,
            ni.codigo::TEXT,
            ni.estado,
            COUNT(m.id)::BIGINT AS total_miembros,
            COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'coordinador')::BIGINT,
            COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'multiplicador')::BIGINT,
            COUNT(m.id) FILTER (WHERE m.tipo_miembro = 'relacionado')::BIGINT
        FROM niveles_intermedios ni
        LEFT JOIN miembros m ON m.nivel_intermedio_id = ni.id AND m.estado = true
        WHERE ni.estado = true
          AND (parent_id IS NULL OR ni.comite_id = parent_id)
        GROUP BY ni.id, ni.nombre, ni.codigo, ni.estado
        ORDER BY ni.nombre;

    ELSE
        RAISE EXCEPTION 'Invalid target_level: %. Must be one of: provincia, municipio, circunscripcion, sector, comite, nivel_intermedio', target_level;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_hierarchy_children(TEXT, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_hierarchy_children(TEXT, UUID) FROM anon, public;

-- ---------------------------------------------------------------------------
-- 7. Trigram indexes for search performance (optional, requires pg_trgm)
-- ---------------------------------------------------------------------------
-- Enable pg_trgm extension if not already enabled, then add trigram indexes
-- on the nombre columns for fast ILIKE searches.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_provincias_nombre_trgm ON provincias USING GIN (nombre gin_trgm_ops);
CREATE INDEX idx_municipios_nombre_trgm ON municipios USING GIN (nombre gin_trgm_ops);
CREATE INDEX idx_circunscripciones_nombre_trgm ON circunscripciones USING GIN (nombre gin_trgm_ops);
CREATE INDEX idx_sectores_nombre_trgm ON sectores USING GIN (nombre gin_trgm_ops);
CREATE INDEX idx_comites_nombre_trgm ON comites USING GIN (nombre gin_trgm_ops);
CREATE INDEX idx_niveles_intermedios_nombre_trgm ON niveles_intermedios USING GIN (nombre gin_trgm_ops);

-- Refresh the new materialized views so they contain data
REFRESH MATERIALIZED VIEW mv_member_count_by_circunscripcion;
REFRESH MATERIALIZED VIEW mv_member_count_by_sector;
REFRESH MATERIALIZED VIEW mv_member_count_by_comite;
