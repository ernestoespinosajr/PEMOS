-- =============================================================================
-- Migration: Create User and Operations Tables
-- =============================================================================
-- Tables for user management (extending Supabase Auth), recinto assignments,
-- unregistered voter tracking, and electoral schedule management.
--
-- After creating usuarios, this migration also adds the FK constraint
-- from votaciones.usuario_id -> usuarios.id that was deferred from the
-- electoral migration.
--
-- Rollback:
--   ALTER TABLE votaciones DROP CONSTRAINT IF EXISTS fk_votaciones_usuario;
--   DROP TRIGGER IF EXISTS trg_cronogramas_updated_at ON cronogramas;
--   DROP TABLE IF EXISTS cronogramas;
--   DROP TRIGGER IF EXISTS trg_seguimiento_no_inscritos_updated_at ON seguimiento_no_inscritos;
--   DROP TABLE IF EXISTS seguimiento_no_inscritos;
--   DROP TRIGGER IF EXISTS trg_asignacion_recintos_updated_at ON asignacion_recintos;
--   DROP TABLE IF EXISTS asignacion_recintos;
--   DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
--   DROP TABLE IF EXISTS usuarios;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: usuarios (Users)
-- ---------------------------------------------------------------------------
-- Extends Supabase Auth user data with PEMOS-specific fields: role,
-- geographic scope, and tenant isolation. The auth_user_id column
-- references Supabase's auth.users table for authentication integration.
-- ---------------------------------------------------------------------------
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role role_usuario NOT NULL DEFAULT 'field_worker',

    -- Geographic scope: determines what data this user can access
    provincia_id UUID REFERENCES provincias(id) ON DELETE RESTRICT,
    municipio_id UUID REFERENCES municipios(id) ON DELETE RESTRICT,
    circunscripcion_id UUID REFERENCES circunscripciones(id) ON DELETE RESTRICT,

    -- Tenant isolation and status
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Add deferred FK: votaciones.usuario_id -> usuarios.id
-- ---------------------------------------------------------------------------
ALTER TABLE votaciones
    ADD CONSTRAINT fk_votaciones_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- Table: asignacion_recintos (Recinto Assignments)
-- ---------------------------------------------------------------------------
-- Assigns users (observers, field workers) to specific recintos for a
-- given electoral period.
-- ---------------------------------------------------------------------------
CREATE TABLE asignacion_recintos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    recinto_id UUID NOT NULL REFERENCES recintos(id) ON DELETE RESTRICT,
    periodo_electoral VARCHAR(20),
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_asignacion_recintos_updated_at
    BEFORE UPDATE ON asignacion_recintos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: seguimiento_no_inscritos (Unregistered Voter Tracking)
-- ---------------------------------------------------------------------------
-- Tracks potential voters who are not yet registered in the JCE electoral
-- roll. Manages the follow-up workflow from initial identification through
-- successful registration or disqualification.
-- ---------------------------------------------------------------------------
CREATE TABLE seguimiento_no_inscritos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cedula VARCHAR(11) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    sector_id UUID REFERENCES sectores(id) ON DELETE RESTRICT,
    estado_seguimiento estado_seguimiento NOT NULL DEFAULT 'pendiente',
    responsable_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    notas TEXT,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_seguimiento_no_inscritos_updated_at
    BEFORE UPDATE ON seguimiento_no_inscritos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Table: cronogramas (Electoral Schedules / Timelines)
-- ---------------------------------------------------------------------------
-- Electoral calendar management for coordinating activities across
-- organizational levels and electoral periods.
-- nivel_geografico + nivel_id allow associating a schedule item with
-- any geographic level dynamically.
-- ---------------------------------------------------------------------------
CREATE TABLE cronogramas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    nivel_geografico VARCHAR(50), -- e.g. 'provincia', 'municipio', 'circunscripcion'
    nivel_id UUID,                -- UUID of the geographic entity
    periodo_electoral VARCHAR(20),
    estado BOOLEAN NOT NULL DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_cronogramas_updated_at
    BEFORE UPDATE ON cronogramas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
