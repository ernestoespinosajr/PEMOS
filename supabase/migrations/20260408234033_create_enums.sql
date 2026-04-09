-- =============================================================================
-- Migration: Create ENUM Types and Utility Functions
-- =============================================================================
-- Creates all custom PostgreSQL ENUM types used across the PEMOS schema.
-- These must be created before any table that references them.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
--   DROP TYPE IF EXISTS estado_seguimiento;
--   DROP TYPE IF EXISTS role_usuario;
--   DROP TYPE IF EXISTS tipo_miembro;
-- =============================================================================

-- Member type classification
-- coordinador: party coordinators who manage groups of members
-- multiplicador: members who recruit and manage related members
-- relacionado: members recruited by a multiplicador
CREATE TYPE tipo_miembro AS ENUM ('coordinador', 'multiplicador', 'relacionado');

-- User role for RBAC
-- admin: full system access, user management, system configuration
-- coordinator: view and manage assigned members and geographic areas
-- observer: monitor real-time voting results, read-only electoral data
-- field_worker: register new members, update member info from mobile
CREATE TYPE role_usuario AS ENUM ('admin', 'coordinator', 'observer', 'field_worker');

-- Follow-up status for unregistered voter tracking
-- pendiente: initial state, not yet contacted
-- contactado: contact has been made
-- registrado: voter has completed registration
-- no_interesado: voter declined or is not interested
CREATE TYPE estado_seguimiento AS ENUM ('pendiente', 'contactado', 'registrado', 'no_interesado');

-- =============================================================================
-- Function: update_updated_at_column()
-- =============================================================================
-- Trigger function to automatically set updated_at to now() on row update.
-- Attached to all tables that have an updated_at column.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
