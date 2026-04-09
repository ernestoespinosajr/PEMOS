-- =============================================================================
-- Migration: Create Member Management Tables
-- =============================================================================
-- The miembros table is the central entity of PEMOS. It stores all party
-- member data including personal information, geographic assignments,
-- coordinator relationships, and flexible social media data via JSONB.
--
-- Key design decisions:
--   - cedula is unique per tenant (composite unique constraint)
--   - coordinador_id is a self-referencing FK with ON DELETE SET NULL
--     (if a coordinator is deleted, their members are not orphaned)
--   - redes_sociales uses JSONB for flexible social media profile storage
--   - All geographic FKs use ON DELETE RESTRICT to prevent orphans
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_miembros_updated_at ON miembros;
--   DROP TABLE IF EXISTS miembros;
-- =============================================================================

CREATE TABLE miembros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Personal identification
    cedula VARCHAR(11) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    sexo VARCHAR(1),

    -- Contact information
    telefono VARCHAR(20),
    celular VARCHAR(20),
    email VARCHAR(255),
    direccion TEXT,

    -- Professional and social
    ocupacion VARCHAR(100),
    redes_sociales JSONB NOT NULL DEFAULT '{}',
    foto_url VARCHAR(500),

    -- Member classification
    tipo_miembro tipo_miembro NOT NULL,

    -- Self-referencing FK: coordinador/multiplicador who manages this member
    -- ON DELETE SET NULL: if the coordinator is removed, the member remains
    coordinador_id UUID REFERENCES miembros(id) ON DELETE SET NULL,

    -- Geographic assignments
    sector_id UUID REFERENCES sectores(id) ON DELETE RESTRICT,
    comite_id UUID REFERENCES comites(id) ON DELETE RESTRICT,
    nivel_intermedio_id UUID REFERENCES niveles_intermedios(id) ON DELETE RESTRICT,
    recinto_id UUID, -- FK added in electoral migration after recintos table exists

    -- Tenant isolation and status
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Composite unique constraint: cedula must be unique within a tenant
    CONSTRAINT uq_miembros_cedula_tenant UNIQUE (cedula, tenant_id)
);

CREATE TRIGGER trg_miembros_updated_at
    BEFORE UPDATE ON miembros
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
