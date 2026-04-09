-- =============================================================================
-- Migration: Create Geographic Hierarchy Tables
-- =============================================================================
-- Dominican Republic political geography: 6 levels from province to
-- intermediary level. All tables use UUID primary keys, tenant isolation,
-- and ON DELETE RESTRICT to prevent orphaned child records.
--
-- Hierarchy: provincias > municipios > circunscripciones > sectores
--            > comites > niveles_intermedios
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_niveles_intermedios_updated_at ON niveles_intermedios;
--   DROP TABLE IF EXISTS niveles_intermedios;
--   DROP TRIGGER IF EXISTS trg_comites_updated_at ON comites;
--   DROP TABLE IF EXISTS comites;
--   DROP TRIGGER IF EXISTS trg_sectores_updated_at ON sectores;
--   DROP TABLE IF EXISTS sectores;
--   DROP TRIGGER IF EXISTS trg_circunscripciones_updated_at ON circunscripciones;
--   DROP TABLE IF EXISTS circunscripciones;
--   DROP TRIGGER IF EXISTS trg_municipios_updated_at ON municipios;
--   DROP TABLE IF EXISTS municipios;
--   DROP TRIGGER IF EXISTS trg_provincias_updated_at ON provincias;
--   DROP TABLE IF EXISTS provincias;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: provincias (Provinces)
-- ---------------------------------------------------------------------------
-- Top level of the Dominican Republic geographic hierarchy.
-- 32 provinces total, each with a unique JCE code.
-- ---------------------------------------------------------------------------
CREATE TABLE provincias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_provincias_updated_at
    BEFORE UPDATE ON provincias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: municipios (Municipalities)
-- ---------------------------------------------------------------------------
-- Second level. Each municipality belongs to exactly one province.
-- ---------------------------------------------------------------------------
CREATE TABLE municipios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provincia_id UUID NOT NULL REFERENCES provincias(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_municipios_updated_at
    BEFORE UPDATE ON municipios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: circunscripciones (Electoral Circumscriptions)
-- ---------------------------------------------------------------------------
-- Third level. Electoral districts within a municipality.
-- Uses 'numero' (integer) instead of 'codigo' for circumscription numbering.
-- ---------------------------------------------------------------------------
CREATE TABLE circunscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id UUID NOT NULL REFERENCES municipios(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    numero INTEGER NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_circunscripciones_updated_at
    BEFORE UPDATE ON circunscripciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: sectores (Sectors)
-- ---------------------------------------------------------------------------
-- Fourth level. Sectors within an electoral circumscription.
-- ---------------------------------------------------------------------------
CREATE TABLE sectores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circunscripcion_id UUID NOT NULL REFERENCES circunscripciones(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sectores_updated_at
    BEFORE UPDATE ON sectores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: comites (Committees / Blocks)
-- ---------------------------------------------------------------------------
-- Fifth level. Committees or blocks within a sector.
-- ---------------------------------------------------------------------------
CREATE TABLE comites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sector_id UUID NOT NULL REFERENCES sectores(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_comites_updated_at
    BEFORE UPDATE ON comites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: niveles_intermedios (Intermediary Levels)
-- ---------------------------------------------------------------------------
-- Sixth and lowest level. Intermediary levels within a committee.
-- ---------------------------------------------------------------------------
CREATE TABLE niveles_intermedios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comite_id UUID NOT NULL REFERENCES comites(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_niveles_intermedios_updated_at
    BEFORE UPDATE ON niveles_intermedios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
