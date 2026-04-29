-- =============================================================================
-- Migration: Movimientos (Sub-Organizations) — Schema
-- =============================================================================
-- Adds the movimientos table for sub-organization management within a tenant.
-- Extends usuarios and miembros to support movimiento-scoped access.
-- Adds the 'supervisor' role to role_usuario enum.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_miembros_movimiento_id;
--   DROP INDEX IF EXISTS idx_usuarios_movimiento_id;
--   DROP INDEX IF EXISTS idx_movimientos_tenant_estado;
--   DROP INDEX IF EXISTS idx_movimientos_tenant_id;
--   ALTER TABLE miembros DROP CONSTRAINT IF EXISTS fk_miembros_movimiento;
--   ALTER TABLE usuarios DROP COLUMN IF EXISTS force_password_change;
--   ALTER TABLE usuarios DROP COLUMN IF EXISTS movimiento_id;
--   DROP TRIGGER IF EXISTS trg_movimientos_updated_at ON movimientos;
--   DROP TABLE IF EXISTS movimientos;
--   -- Note: enum values cannot be removed in PG < 16
-- =============================================================================


-- =============================================================================
-- STEP 1: Add 'supervisor' role to role_usuario enum
-- =============================================================================
-- supervisor: read access scoped to their assigned movimiento

ALTER TYPE role_usuario ADD VALUE IF NOT EXISTS 'supervisor';


-- =============================================================================
-- STEP 2: Create movimientos table
-- =============================================================================

CREATE TABLE movimientos (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  nombre                     VARCHAR(255) NOT NULL,
  siglas                     VARCHAR(50),
  tipo_estructura            VARCHAR(100) NOT NULL DEFAULT 'Movimiento',
  fecha_fundacion            DATE,
  ambito_accion              TEXT[],
  descripcion                TEXT,
  ejes_trabajo               TEXT[],
  provincias_operacion       UUID[],
  municipios_operacion       UUID[],
  redes_sociales             JSONB,
  logo_url                   TEXT,
  representante_nombre       VARCHAR(200),
  representante_cedula       VARCHAR(20),
  representante_cargo        VARCHAR(100) DEFAULT 'Coordinador(a)',
  representante_telefono     VARCHAR(20),
  representante_email        VARCHAR(255),
  representante_provincia_id UUID REFERENCES provincias(id),
  representante_municipio_id UUID REFERENCES municipios(id),
  representante_direccion    TEXT,
  equipo_enlace              JSONB,
  cantidad_miembros_estimada VARCHAR(20),
  estructura_territorial     TEXT[],
  zonas_comunidades          TEXT,
  experiencia_previa         TEXT,
  estado                     BOOLEAN NOT NULL DEFAULT true,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_movimientos_updated_at
  BEFORE UPDATE ON movimientos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- STEP 3: Extend usuarios table
-- =============================================================================
-- movimiento_id: when set, this user is scoped to that movimiento
-- force_password_change: flag to require password reset on next login

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS movimiento_id UUID REFERENCES movimientos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;


-- =============================================================================
-- STEP 4: Add FK on miembros.movimiento_id
-- =============================================================================
-- The column already exists (added in an earlier migration). We just add the
-- FK constraint now that the movimientos table exists.

ALTER TABLE miembros
  ADD CONSTRAINT fk_miembros_movimiento
  FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE SET NULL;


-- =============================================================================
-- STEP 5: Indexes
-- =============================================================================

CREATE INDEX idx_movimientos_tenant_id ON movimientos(tenant_id);
CREATE INDEX idx_movimientos_tenant_estado ON movimientos(tenant_id, estado);
CREATE INDEX idx_usuarios_movimiento_id ON usuarios(movimiento_id);
CREATE INDEX idx_miembros_movimiento_id ON miembros(movimiento_id);
