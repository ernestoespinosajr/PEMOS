-- =============================================================================
-- Migration: Create Electoral Process Tables
-- =============================================================================
-- Tables for political parties, positions, candidates, polling stations,
-- vote recording, and per-candidate vote tallies.
--
-- After creating recintos, this migration also adds the FK constraint
-- from miembros.recinto_id -> recintos.id that was deferred from the
-- member migration.
--
-- Rollback:
--   ALTER TABLE miembros DROP CONSTRAINT IF EXISTS fk_miembros_recinto;
--   DROP TRIGGER IF EXISTS trg_candidato_votos_updated_at ON candidato_votos;
--   DROP TABLE IF EXISTS candidato_votos;
--   DROP TRIGGER IF EXISTS trg_votaciones_updated_at ON votaciones;
--   DROP TABLE IF EXISTS votaciones;
--   DROP TRIGGER IF EXISTS trg_recintos_updated_at ON recintos;
--   DROP TABLE IF EXISTS recintos;
--   DROP TRIGGER IF EXISTS trg_candidatos_updated_at ON candidatos;
--   DROP TABLE IF EXISTS candidatos;
--   DROP TRIGGER IF EXISTS trg_cargos_updated_at ON cargos;
--   DROP TABLE IF EXISTS cargos;
--   DROP TRIGGER IF EXISTS trg_partidos_updated_at ON partidos;
--   DROP TABLE IF EXISTS partidos;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: partidos (Political Parties)
-- ---------------------------------------------------------------------------
CREATE TABLE partidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    siglas VARCHAR(20) NOT NULL,
    logo_url VARCHAR(500),
    color VARCHAR(7), -- Hex color code, e.g. #FF0000
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_partidos_updated_at
    BEFORE UPDATE ON partidos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: cargos (Electoral Positions / Offices)
-- ---------------------------------------------------------------------------
CREATE TABLE cargos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    nivel VARCHAR(50), -- e.g. nacional, provincial, municipal
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_cargos_updated_at
    BEFORE UPDATE ON cargos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: candidatos (Candidates)
-- ---------------------------------------------------------------------------
-- Links a member to a party and position for a given electoral period.
-- ---------------------------------------------------------------------------
CREATE TABLE candidatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    miembro_id UUID NOT NULL REFERENCES miembros(id) ON DELETE RESTRICT,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    cargo_id UUID NOT NULL REFERENCES cargos(id) ON DELETE RESTRICT,
    periodo_electoral VARCHAR(20),
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_candidatos_updated_at
    BEFORE UPDATE ON candidatos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: recintos (Polling Stations / Precincts)
-- ---------------------------------------------------------------------------
-- Polling stations assigned to geographic areas. Each recinto belongs to
-- a municipality and may also be assigned to a specific circumscription.
-- ---------------------------------------------------------------------------
CREATE TABLE recintos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    direccion TEXT,
    municipio_id UUID NOT NULL REFERENCES municipios(id) ON DELETE RESTRICT,
    circunscripcion_id UUID REFERENCES circunscripciones(id) ON DELETE RESTRICT,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_recintos_updated_at
    BEFORE UPDATE ON recintos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Add deferred FK: miembros.recinto_id -> recintos.id
-- ---------------------------------------------------------------------------
ALTER TABLE miembros
    ADD CONSTRAINT fk_miembros_recinto
    FOREIGN KEY (recinto_id) REFERENCES recintos(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- Table: votaciones (Vote Records)
-- ---------------------------------------------------------------------------
-- Records vote tallies per recinto and electoral period.
-- opcion_01, opcion_02, opcion_03 represent the three voting options.
-- usuario_id tracks which user submitted the record.
-- acta_url links to the scanned official electoral act document.
-- ---------------------------------------------------------------------------
CREATE TABLE votaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recinto_id UUID NOT NULL REFERENCES recintos(id) ON DELETE RESTRICT,
    periodo_electoral VARCHAR(20),
    fecha DATE,
    opcion_01 INTEGER NOT NULL DEFAULT 0,
    opcion_02 INTEGER NOT NULL DEFAULT 0,
    opcion_03 INTEGER NOT NULL DEFAULT 0,
    observaciones TEXT,
    acta_url VARCHAR(500),
    usuario_id UUID, -- FK added in user_operations migration after usuarios table exists
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_votaciones_updated_at
    BEFORE UPDATE ON votaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: candidato_votos (Candidate Vote Tallies)
-- ---------------------------------------------------------------------------
-- Individual candidate vote counts linked to a specific votacion record.
-- ---------------------------------------------------------------------------
CREATE TABLE candidato_votos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    votacion_id UUID NOT NULL REFERENCES votaciones(id) ON DELETE RESTRICT,
    candidato_id UUID NOT NULL REFERENCES candidatos(id) ON DELETE RESTRICT,
    votos INTEGER NOT NULL DEFAULT 0,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_candidato_votos_updated_at
    BEFORE UPDATE ON candidato_votos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
