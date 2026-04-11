-- =============================================================================
-- Migration: Electoral Process Monitoring Schema (ftr-006 Phase 1)
-- =============================================================================
-- Evolves the electoral schema to support the full electoral monitoring system:
--
--   NEW TABLES:
--     - periodos_electorales (electoral periods)
--     - colegios (voting halls within recintos)
--     - partido_votos (party-level vote aggregation per colegio)
--     - actas (append-only electoral act documents)
--
--   ALTERED TABLES:
--     - candidatos: adds nombre, orden, periodo_id; drops NOT NULL on
--       miembro_id/cargo_id (legacy columns kept nullable)
--     - recintos: renames codigo to cod_recinto, adds partido_id with
--       UNIQUE(cod_recinto, partido_id)
--
--   DROPPED & RECREATED:
--     - candidato_votos: restructured from votacion_id linkage to direct
--       colegio_id/recinto_id/periodo_id/partido_id linkage
--     - asignacion_recintos: restructured to reference auth.users(id) directly,
--       adds colegio_id/periodo_id/partido_id
--
--   DROPPED (superseded by new design):
--     - votaciones: replaced by candidato_votos + actas design
--
--   NEW MATERIALIZED VIEWS:
--     - mv_votos_por_partido_circunscripcion
--     - mv_turnout_por_recinto
--
--   UPDATED MATERIALIZED VIEWS:
--     - mv_vote_totals_by_partido: recreated against new candidato_votos
--     - mv_vote_totals_by_recinto: recreated against new candidato_votos
--     - refresh_materialized_views(): updated to include new views
--
--   NEW FUNCTIONS:
--     - init_vote_records(UUID, UUID, UUID, UUID): auto-creates candidato_votos
--       rows for all active candidates when a colegio is first accessed
--
--   REALTIME:
--     - candidato_votos added to supabase_realtime publication
--     - actas added to supabase_realtime publication
--
-- Rollback:
--   -- Realtime
--   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS candidato_votos;
--   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS actas;
--
--   -- Functions
--   DROP FUNCTION IF EXISTS public.init_vote_records(UUID, UUID, UUID, UUID);
--
--   -- New materialized views
--   DROP MATERIALIZED VIEW IF EXISTS mv_turnout_por_recinto;
--   DROP MATERIALIZED VIEW IF EXISTS mv_votos_por_partido_circunscripcion;
--
--   -- Recreated materialized views (restore originals manually from 20260408234055)
--   DROP MATERIALIZED VIEW IF EXISTS mv_vote_totals_by_recinto;
--   DROP MATERIALIZED VIEW IF EXISTS mv_vote_totals_by_partido;
--
--   -- Drop refresh function (restore original from 20260408234055)
--   DROP FUNCTION IF EXISTS refresh_materialized_views();
--
--   -- New indexes (for new tables -- table drops cascade these)
--   -- Indexes on altered tables:
--   DROP INDEX IF EXISTS idx_candidatos_periodo_id;
--   DROP INDEX IF EXISTS idx_candidatos_orden;
--   DROP INDEX IF EXISTS idx_recintos_partido_id;
--   ALTER TABLE recintos DROP CONSTRAINT IF EXISTS uq_recintos_cod_recinto_partido;
--
--   -- New tables (reverse order of creation)
--   DROP TABLE IF EXISTS actas;
--   DROP TRIGGER IF EXISTS trg_partido_votos_updated_at ON partido_votos;
--   DROP TABLE IF EXISTS partido_votos;
--   DROP TRIGGER IF EXISTS trg_candidato_votos_updated_at ON candidato_votos;
--   DROP TABLE IF EXISTS candidato_votos;
--   DROP TRIGGER IF EXISTS trg_asignacion_recintos_updated_at ON asignacion_recintos;
--   DROP TABLE IF EXISTS asignacion_recintos;
--   DROP TRIGGER IF EXISTS trg_colegios_updated_at ON colegios;
--   DROP TABLE IF EXISTS colegios;
--   DROP TRIGGER IF EXISTS trg_periodos_electorales_updated_at ON periodos_electorales;
--   DROP TABLE IF EXISTS periodos_electorales;
--
--   -- Restore recintos (rename column back, remove partido_id)
--   ALTER TABLE recintos RENAME COLUMN cod_recinto TO codigo;
--   ALTER TABLE recintos DROP COLUMN IF EXISTS partido_id;
--
--   -- Restore candidatos (re-add NOT NULL on miembro_id, cargo_id; drop new cols)
--   ALTER TABLE candidatos DROP COLUMN IF EXISTS nombre;
--   ALTER TABLE candidatos DROP COLUMN IF EXISTS orden;
--   ALTER TABLE candidatos DROP COLUMN IF EXISTS periodo_id;
--   ALTER TABLE candidatos ALTER COLUMN miembro_id SET NOT NULL;
--   ALTER TABLE candidatos ALTER COLUMN cargo_id SET NOT NULL;
--
--   -- Restore asignacion_recintos (recreate original from 20260408234050)
--   CREATE TABLE asignacion_recintos ( ... );  -- see original migration
--
--   -- Restore candidato_votos (recreate original from 20260408234047)
--   CREATE TABLE candidato_votos ( ... );  -- see original migration
--
--   -- Restore votaciones (recreate from 20260408234047)
--   CREATE TABLE votaciones ( ... );  -- see original migration
--   -- Restore FK: votaciones.usuario_id -> usuarios.id
--   -- Restore indexes on votaciones from 20260408234052
-- =============================================================================


-- =============================================================================
-- STEP 1: Create periodos_electorales table (must exist before FKs reference it)
-- =============================================================================

CREATE TABLE periodos_electorales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,  -- 'primaria', 'general', 'municipal'
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT false,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_periodos_electorales_updated_at
    BEFORE UPDATE ON periodos_electorales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_periodos_electorales_partido_id ON periodos_electorales(partido_id);
CREATE INDEX idx_periodos_electorales_activo ON periodos_electorales(activo);
CREATE INDEX idx_periodos_electorales_tenant_id ON periodos_electorales(tenant_id);
CREATE INDEX idx_periodos_electorales_estado ON periodos_electorales(estado);


-- =============================================================================
-- STEP 2: Alter recintos -- rename codigo, add partido_id, add UNIQUE constraint
-- =============================================================================

-- Rename for naming consistency with colegios.cod_colegio
ALTER TABLE recintos RENAME COLUMN codigo TO cod_recinto;

ALTER TABLE recintos
    ADD COLUMN partido_id UUID REFERENCES partidos(id) ON DELETE RESTRICT;

-- UNIQUE constraint: a recinto code is unique per party
ALTER TABLE recintos
    ADD CONSTRAINT uq_recintos_cod_recinto_partido UNIQUE (cod_recinto, partido_id);

CREATE INDEX idx_recintos_partido_id ON recintos(partido_id);


-- =============================================================================
-- STEP 3: Create colegios table
-- =============================================================================

CREATE TABLE colegios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cod_colegio VARCHAR(20) NOT NULL,
    nombre VARCHAR(255),
    recinto_id UUID NOT NULL REFERENCES recintos(id) ON DELETE RESTRICT,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_colegios_cod_recinto_partido UNIQUE (cod_colegio, recinto_id, partido_id)
);

CREATE TRIGGER trg_colegios_updated_at
    BEFORE UPDATE ON colegios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_colegios_recinto_id ON colegios(recinto_id);
CREATE INDEX idx_colegios_partido_id ON colegios(partido_id);
CREATE INDEX idx_colegios_tenant_id ON colegios(tenant_id);
CREATE INDEX idx_colegios_estado ON colegios(estado);


-- =============================================================================
-- STEP 4: Alter candidatos -- add new columns, relax legacy columns
-- =============================================================================

-- Add new columns (nullable initially for existing rows)
ALTER TABLE candidatos ADD COLUMN nombre VARCHAR(255);
ALTER TABLE candidatos ADD COLUMN orden INTEGER;
ALTER TABLE candidatos ADD COLUMN periodo_id UUID REFERENCES periodos_electorales(id) ON DELETE RESTRICT;

-- Relax legacy FK columns to nullable (they remain for backward compatibility
-- but are no longer required for the ftr-006 candidate registration flow)
ALTER TABLE candidatos ALTER COLUMN miembro_id DROP NOT NULL;
ALTER TABLE candidatos ALTER COLUMN cargo_id DROP NOT NULL;

-- New indexes
CREATE INDEX idx_candidatos_periodo_id ON candidatos(periodo_id);
CREATE INDEX idx_candidatos_orden ON candidatos(orden);


-- =============================================================================
-- STEP 5a: Drop materialized views that depend on candidato_votos / votaciones
-- =============================================================================
-- The old mv_vote_totals_by_partido and mv_vote_totals_by_recinto reference
-- candidato_votos and votaciones. They must be dropped BEFORE those tables.
-- They will be recreated in Step 11 against the new schema.

DROP MATERIALIZED VIEW IF EXISTS mv_vote_totals_by_recinto;
DROP MATERIALIZED VIEW IF EXISTS mv_vote_totals_by_partido;

-- =============================================================================
-- STEP 5b: Drop candidato_votos (depends on votaciones via FK)
-- =============================================================================
-- Must drop candidato_votos before votaciones because candidato_votos.votacion_id
-- references votaciones.id.

-- Drop existing RLS policies on candidato_votos (will be recreated in RLS migration)
DROP POLICY IF EXISTS "candidato_votos_select" ON candidato_votos;
DROP POLICY IF EXISTS "candidato_votos_insert" ON candidato_votos;
DROP POLICY IF EXISTS "candidato_votos_update" ON candidato_votos;
DROP POLICY IF EXISTS "candidato_votos_delete_admin" ON candidato_votos;

-- Drop indexes
DROP INDEX IF EXISTS idx_candidato_votos_votacion_id;
DROP INDEX IF EXISTS idx_candidato_votos_candidato_id;
DROP INDEX IF EXISTS idx_candidato_votos_tenant_id;

-- Drop trigger and table
DROP TRIGGER IF EXISTS trg_candidato_votos_updated_at ON candidato_votos;
DROP TABLE candidato_votos;


-- =============================================================================
-- STEP 6: Drop votaciones (no longer needed -- replaced by candidato_votos + actas)
-- =============================================================================

-- Drop existing RLS policies on votaciones
DROP POLICY IF EXISTS "votaciones_select" ON votaciones;
DROP POLICY IF EXISTS "votaciones_insert" ON votaciones;
DROP POLICY IF EXISTS "votaciones_update" ON votaciones;
DROP POLICY IF EXISTS "votaciones_delete_admin" ON votaciones;

-- Drop the deferred FK from votaciones.usuario_id -> usuarios.id
ALTER TABLE votaciones DROP CONSTRAINT IF EXISTS fk_votaciones_usuario;

-- Drop indexes
DROP INDEX IF EXISTS idx_votaciones_recinto_id;
DROP INDEX IF EXISTS idx_votaciones_usuario_id;
DROP INDEX IF EXISTS idx_votaciones_periodo_electoral;
DROP INDEX IF EXISTS idx_votaciones_fecha;
DROP INDEX IF EXISTS idx_votaciones_tenant_id;
DROP INDEX IF EXISTS idx_votaciones_estado;
DROP INDEX IF EXISTS idx_votaciones_recinto_periodo;

-- Drop trigger and table
DROP TRIGGER IF EXISTS trg_votaciones_updated_at ON votaciones;
DROP TABLE votaciones;


-- =============================================================================
-- STEP 7: Drop and recreate asignacion_recintos
-- =============================================================================

-- Drop existing RLS policies
DROP POLICY IF EXISTS "asignacion_recintos_select" ON asignacion_recintos;
DROP POLICY IF EXISTS "asignacion_recintos_insert_admin" ON asignacion_recintos;
DROP POLICY IF EXISTS "asignacion_recintos_update_admin" ON asignacion_recintos;
DROP POLICY IF EXISTS "asignacion_recintos_delete_admin" ON asignacion_recintos;

-- Drop indexes
DROP INDEX IF EXISTS idx_asignacion_recintos_usuario_id;
DROP INDEX IF EXISTS idx_asignacion_recintos_recinto_id;
DROP INDEX IF EXISTS idx_asignacion_recintos_periodo;
DROP INDEX IF EXISTS idx_asignacion_recintos_tenant_id;
DROP INDEX IF EXISTS idx_asignacion_recintos_estado;

-- Drop trigger and table
DROP TRIGGER IF EXISTS trg_asignacion_recintos_updated_at ON asignacion_recintos;
DROP TABLE asignacion_recintos;

-- Recreate with new schema
CREATE TABLE asignacion_recintos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recinto_id UUID NOT NULL REFERENCES recintos(id) ON DELETE RESTRICT,
    colegio_id UUID REFERENCES colegios(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    periodo_id UUID NOT NULL REFERENCES periodos_electorales(id) ON DELETE RESTRICT,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_asignacion_recinto_colegio_usuario_periodo
        UNIQUE (recinto_id, colegio_id, usuario_id, periodo_id)
);

CREATE TRIGGER trg_asignacion_recintos_updated_at
    BEFORE UPDATE ON asignacion_recintos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_asignacion_recintos_recinto_id ON asignacion_recintos(recinto_id);
CREATE INDEX idx_asignacion_recintos_colegio_id ON asignacion_recintos(colegio_id);
CREATE INDEX idx_asignacion_recintos_usuario_id ON asignacion_recintos(usuario_id);
CREATE INDEX idx_asignacion_recintos_periodo_id ON asignacion_recintos(periodo_id);
CREATE INDEX idx_asignacion_recintos_partido_id ON asignacion_recintos(partido_id);
CREATE INDEX idx_asignacion_recintos_tenant_id ON asignacion_recintos(tenant_id);
CREATE INDEX idx_asignacion_recintos_estado ON asignacion_recintos(estado);


-- =============================================================================
-- STEP 8: Recreate candidato_votos with new schema
-- =============================================================================

CREATE TABLE candidato_votos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidato_id UUID NOT NULL REFERENCES candidatos(id) ON DELETE RESTRICT,
    colegio_id UUID NOT NULL REFERENCES colegios(id) ON DELETE RESTRICT,
    recinto_id UUID NOT NULL REFERENCES recintos(id) ON DELETE RESTRICT,
    votos INTEGER NOT NULL DEFAULT 0 CHECK (votos >= 0),
    periodo_id UUID NOT NULL REFERENCES periodos_electorales(id) ON DELETE RESTRICT,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES auth.users(id),
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_candidato_votos_candidato_colegio_periodo
        UNIQUE (candidato_id, colegio_id, periodo_id)
);

CREATE TRIGGER trg_candidato_votos_updated_at
    BEFORE UPDATE ON candidato_votos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_candidato_votos_candidato_id ON candidato_votos(candidato_id);
CREATE INDEX idx_candidato_votos_colegio_id ON candidato_votos(colegio_id);
CREATE INDEX idx_candidato_votos_recinto_id ON candidato_votos(recinto_id);
CREATE INDEX idx_candidato_votos_periodo_id ON candidato_votos(periodo_id);
CREATE INDEX idx_candidato_votos_partido_id ON candidato_votos(partido_id);
CREATE INDEX idx_candidato_votos_updated_by ON candidato_votos(updated_by);
CREATE INDEX idx_candidato_votos_tenant_id ON candidato_votos(tenant_id);
CREATE INDEX idx_candidato_votos_estado ON candidato_votos(estado);


-- =============================================================================
-- STEP 9: Create partido_votos table
-- =============================================================================

CREATE TABLE partido_votos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recinto_id UUID NOT NULL REFERENCES recintos(id) ON DELETE RESTRICT,
    colegio_id UUID NOT NULL REFERENCES colegios(id) ON DELETE RESTRICT,
    partido_ref_id INTEGER NOT NULL,  -- party reference ID (legacy pattern)
    candidato_1_votos INTEGER NOT NULL DEFAULT 0,
    candidato_2_votos INTEGER NOT NULL DEFAULT 0,
    candidato_3_votos INTEGER NOT NULL DEFAULT 0,
    candidato_4_votos INTEGER NOT NULL DEFAULT 0,
    candidato_5_votos INTEGER NOT NULL DEFAULT 0,
    candidato_6_votos INTEGER NOT NULL DEFAULT 0,
    periodo_id UUID NOT NULL REFERENCES periodos_electorales(id) ON DELETE RESTRICT,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_partido_votos_recinto_colegio_partido_ref_periodo
        UNIQUE (recinto_id, colegio_id, partido_ref_id, periodo_id)
);

CREATE TRIGGER trg_partido_votos_updated_at
    BEFORE UPDATE ON partido_votos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_partido_votos_recinto_id ON partido_votos(recinto_id);
CREATE INDEX idx_partido_votos_colegio_id ON partido_votos(colegio_id);
CREATE INDEX idx_partido_votos_periodo_id ON partido_votos(periodo_id);
CREATE INDEX idx_partido_votos_partido_id ON partido_votos(partido_id);
CREATE INDEX idx_partido_votos_tenant_id ON partido_votos(tenant_id);
CREATE INDEX idx_partido_votos_estado ON partido_votos(estado);


-- =============================================================================
-- STEP 10: Create actas table (append-only -- no updated_at, no update trigger)
-- =============================================================================

CREATE TABLE actas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_acta VARCHAR(50),
    recinto_id UUID NOT NULL REFERENCES recintos(id) ON DELETE RESTRICT,
    colegio_id UUID NOT NULL REFERENCES colegios(id) ON DELETE RESTRICT,
    votos_data JSONB NOT NULL,  -- { "candidato_id": vote_count, ... }
    observaciones TEXT,
    registrado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    periodo_id UUID NOT NULL REFERENCES periodos_electorales(id) ON DELETE RESTRICT,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    -- No updated_at: actas are append-only for audit integrity
);

CREATE INDEX idx_actas_recinto_id ON actas(recinto_id);
CREATE INDEX idx_actas_colegio_id ON actas(colegio_id);
CREATE INDEX idx_actas_periodo_id ON actas(periodo_id);
CREATE INDEX idx_actas_partido_id ON actas(partido_id);
CREATE INDEX idx_actas_registrado_por ON actas(registrado_por);
CREATE INDEX idx_actas_tenant_id ON actas(tenant_id);
CREATE INDEX idx_actas_estado ON actas(estado);
CREATE INDEX idx_actas_votos_data ON actas USING GIN (votos_data);


-- =============================================================================
-- STEP 11: Recreate materialized views against the new schema
-- =============================================================================
-- The old mv_vote_totals_by_partido and mv_vote_totals_by_recinto were
-- already dropped in Step 5a. Now recreate them against the new schema.

-- Recreate mv_vote_totals_by_partido against new candidato_votos schema
CREATE MATERIALIZED VIEW mv_vote_totals_by_partido AS
SELECT
    pa.id AS partido_id,
    pa.nombre AS partido_nombre,
    pa.siglas AS partido_siglas,
    pa.color AS partido_color,
    cv.periodo_id,
    pa.tenant_id,
    COUNT(DISTINCT cv.recinto_id) AS recintos_reportados,
    SUM(cv.votos) AS total_votos
FROM partidos pa
LEFT JOIN candidatos ca ON ca.partido_id = pa.id AND ca.estado = true
LEFT JOIN candidato_votos cv ON cv.candidato_id = ca.id AND cv.estado = true
WHERE pa.estado = true
GROUP BY pa.id, pa.nombre, pa.siglas, pa.color, cv.periodo_id, pa.tenant_id;

CREATE UNIQUE INDEX idx_mv_vote_totals_partido_id
    ON mv_vote_totals_by_partido(partido_id, periodo_id, tenant_id);

-- Recreate mv_vote_totals_by_recinto against new candidato_votos schema
CREATE MATERIALIZED VIEW mv_vote_totals_by_recinto AS
SELECT
    r.id AS recinto_id,
    r.nombre AS recinto_nombre,
    r.cod_recinto AS recinto_codigo,
    r.municipio_id,
    mu.nombre AS municipio_nombre,
    cv.periodo_id,
    r.tenant_id,
    SUM(cv.votos) AS total_votos,
    COUNT(DISTINCT cv.candidato_id) AS candidatos_reportados,
    COUNT(DISTINCT cv.colegio_id) AS colegios_reportados
FROM recintos r
LEFT JOIN municipios mu ON mu.id = r.municipio_id
LEFT JOIN candidato_votos cv ON cv.recinto_id = r.id AND cv.estado = true
WHERE r.estado = true
GROUP BY r.id, r.nombre, r.cod_recinto, r.municipio_id, mu.nombre, cv.periodo_id, r.tenant_id;

CREATE UNIQUE INDEX idx_mv_vote_totals_recinto_id
    ON mv_vote_totals_by_recinto(recinto_id, periodo_id, tenant_id);

-- New materialized view: vote totals by party by circunscripcion
CREATE MATERIALIZED VIEW mv_votos_por_partido_circunscripcion AS
SELECT
    r.circunscripcion_id,
    ca.partido_id AS candidato_partido_id,
    cv.periodo_id,
    cv.partido_id,
    cv.tenant_id,
    SUM(cv.votos) AS total_votos
FROM candidato_votos cv
JOIN candidatos ca ON ca.id = cv.candidato_id
JOIN recintos r ON r.id = cv.recinto_id
WHERE cv.estado = true
GROUP BY r.circunscripcion_id, ca.partido_id, cv.periodo_id, cv.partido_id, cv.tenant_id;

CREATE UNIQUE INDEX idx_mv_votos_partido_circunscripcion
    ON mv_votos_por_partido_circunscripcion(
        circunscripcion_id, candidato_partido_id, periodo_id, partido_id, tenant_id
    );

-- New materialized view: turnout by recinto
CREATE MATERIALIZED VIEW mv_turnout_por_recinto AS
SELECT
    r.id AS recinto_id,
    r.nombre AS recinto_nombre,
    r.tenant_id,
    COUNT(m.id) AS total_miembros,
    COUNT(CASE WHEN m.votacion = true THEN 1 END) AS votaron,
    COUNT(CASE WHEN m.votacion = false OR m.votacion IS NULL THEN 1 END) AS no_votaron
FROM recintos r
LEFT JOIN miembros m ON m.recinto_id = r.id AND m.estado = true
WHERE r.estado = true
GROUP BY r.id, r.nombre, r.tenant_id;

CREATE UNIQUE INDEX idx_mv_turnout_por_recinto
    ON mv_turnout_por_recinto(recinto_id, tenant_id);


-- =============================================================================
-- STEP 12: Update refresh_materialized_views() to include new views
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 13: Create init_vote_records function
-- =============================================================================
-- Auto-creates candidato_votos rows for ALL active candidates in a given
-- periodo when a colegio is first accessed for vote recording.
-- This mirrors the legacy CandidatoVotoBE.ConsultarOCrearRegistrosCandidato()
-- pattern. Idempotent: uses ON CONFLICT DO NOTHING.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.init_vote_records(
    p_colegio_id UUID,
    p_recinto_id UUID,
    p_periodo_id UUID,
    p_partido_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    INSERT INTO candidato_votos (
        candidato_id, colegio_id, recinto_id, votos,
        periodo_id, partido_id, updated_by, tenant_id
    )
    SELECT
        c.id,
        p_colegio_id,
        p_recinto_id,
        0,
        p_periodo_id,
        p_partido_id,
        auth.uid(),
        c.tenant_id
    FROM candidatos c
    WHERE c.periodo_id = p_periodo_id
      AND c.partido_id = p_partido_id
      AND c.estado = true
    ON CONFLICT (candidato_id, colegio_id, periodo_id) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 14: Enable Supabase Realtime on vote tables
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE candidato_votos;
ALTER PUBLICATION supabase_realtime ADD TABLE actas;
