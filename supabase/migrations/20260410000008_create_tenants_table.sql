-- =============================================================================
-- Migration: Create Tenants Table & Platform Admin Role (ftr-011 Phase 1)
-- =============================================================================
-- Establishes the tenants table as the authoritative source for tenant identity
-- in PEMOS multi-tenant architecture. Adds the platform_admin role to the
-- role_usuario enum, adds FK from usuarios.tenant_id to tenants.id, and
-- updates the JWT custom_access_token_hook to recognize platform_admin.
--
-- Changes:
--   NEW TABLE: tenants (tenant metadata, branding, plan, limits)
--   ALTERED ENUM: role_usuario (add 'platform_admin')
--   ALTERED TABLE: usuarios (add FK tenant_id -> tenants.id)
--   ALTERED FUNCTION: custom_access_token_hook (platform_admin bypass)
--   ALTERED FUNCTION: get_my_tenant_id() (platform_admin returns NULL for cross-tenant)
--   NEW FUNCTION: is_platform_admin() (helper for RLS policies)
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.is_platform_admin();
--   -- Restore original custom_access_token_hook from 20260409000001
--   -- Restore original get_my_tenant_id from 20260409000002
--   ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS fk_usuarios_tenant;
--   DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
--   DROP INDEX IF EXISTS idx_tenants_slug;
--   DROP INDEX IF EXISTS idx_tenants_activo;
--   DROP INDEX IF EXISTS idx_tenants_plan;
--   DROP TABLE IF EXISTS tenants;
--   -- Reverse enum change (requires recreate — see note below)
--   -- ALTER TYPE role_usuario ... (enum values cannot be removed in PG < 16)
-- =============================================================================


-- =============================================================================
-- STEP 1: Create tenants table
-- =============================================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    color_primario VARCHAR(7) DEFAULT '#2D6A4F',
    color_secundario VARCHAR(7) DEFAULT '#1B4332',
    plan VARCHAR(50) NOT NULL DEFAULT 'basico',
    activo BOOLEAN NOT NULL DEFAULT true,
    max_usuarios INTEGER NOT NULL DEFAULT 50,
    max_miembros INTEGER NOT NULL DEFAULT 10000,
    configuracion JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Validate plan values at the database level
    CONSTRAINT chk_tenants_plan CHECK (plan IN ('basico', 'profesional', 'empresarial')),
    -- Validate hex color format
    CONSTRAINT chk_tenants_color_primario CHECK (color_primario ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_tenants_color_secundario CHECK (color_secundario ~ '^#[0-9A-Fa-f]{6}$'),
    -- Validate slug format (lowercase alphanumeric + hyphens, no leading/trailing hyphens)
    CONSTRAINT chk_tenants_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    -- Positive limits
    CONSTRAINT chk_tenants_max_usuarios CHECK (max_usuarios > 0),
    CONSTRAINT chk_tenants_max_miembros CHECK (max_miembros > 0)
);

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for common query patterns
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_activo ON tenants(activo);
CREATE INDEX idx_tenants_plan ON tenants(plan);


-- =============================================================================
-- STEP 2: Add platform_admin to role_usuario enum
-- =============================================================================
-- PostgreSQL allows adding values to enums but not removing them.
-- platform_admin is the highest privilege role -- can manage all tenants.

ALTER TYPE role_usuario ADD VALUE IF NOT EXISTS 'platform_admin';


-- =============================================================================
-- STEP 3: Add FK from usuarios.tenant_id to tenants.id
-- =============================================================================
-- The tenant_id column already exists on usuarios (UUID, nullable).
-- We add a FK constraint referencing tenants.id.
-- ON DELETE RESTRICT: cannot delete a tenant while users reference it.

ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;


-- =============================================================================
-- STEP 4: Enable RLS on tenants table
-- =============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;


-- =============================================================================
-- STEP 5: Create is_platform_admin() helper function
-- =============================================================================
-- Returns TRUE if the authenticated user has the platform_admin role.
-- Used in RLS policies to allow cross-tenant access for platform admins.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt()->>'role') = 'platform_admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon, PUBLIC;


-- =============================================================================
-- STEP 6: Update get_my_tenant_id() to handle platform_admin
-- =============================================================================
-- Platform admins have a tenant_id in JWT (their home tenant), but RLS policies
-- should NOT restrict them to that tenant. We keep the existing function
-- behavior (returns the JWT tenant_id) -- platform_admin bypass is handled
-- at the policy level using is_platform_admin() OR tenant_id = get_my_tenant_id().

-- No change needed to get_my_tenant_id() itself. The bypass is in the policies.


-- =============================================================================
-- STEP 7: Update custom_access_token_hook to handle platform_admin
-- =============================================================================
-- The hook already reads role from usuarios and injects it into JWT.
-- Since platform_admin is now a valid role_usuario enum value, the hook
-- will automatically inject 'platform_admin' when a user has that role.
-- We also inject the tenant's configuration (branding) for tenant admins.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
    claims JSONB;
    user_role TEXT;
    user_tenant_id UUID;
    user_provincia_id UUID;
    user_municipio_id UUID;
    user_circunscripcion_id UUID;
    tenant_activo BOOLEAN;
    tenant_config JSONB;
BEGIN
    -- Look up user in usuarios table
    SELECT
        u.role::TEXT, u.tenant_id,
        u.provincia_id, u.municipio_id, u.circunscripcion_id
    INTO
        user_role, user_tenant_id,
        user_provincia_id, user_municipio_id, user_circunscripcion_id
    FROM public.usuarios u
    WHERE u.auth_user_id = (event->>'user_id')::UUID;

    -- If no user found, return event unchanged
    IF user_role IS NULL THEN
        RETURN event;
    END IF;

    -- Check if tenant is active (skip for platform_admin -- they always have access)
    IF user_role != 'platform_admin' AND user_tenant_id IS NOT NULL THEN
        SELECT t.activo INTO tenant_activo
        FROM public.tenants t
        WHERE t.id = user_tenant_id;

        -- If tenant is suspended/inactive, block the login by returning
        -- claims with a suspended flag. The application layer checks this.
        IF tenant_activo IS NOT TRUE THEN
            claims := event->'claims';
            claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
            claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));
            claims := jsonb_set(claims, '{tenant_suspended}', 'true'::jsonb);
            event := jsonb_set(event, '{claims}', claims);
            RETURN event;
        END IF;
    END IF;

    -- Build claims from existing token claims
    claims := event->'claims';

    -- Inject role and tenant_id
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));

    -- Inject tenant branding for non-platform-admin users
    IF user_role != 'platform_admin' AND user_tenant_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'nombre', t.nombre,
            'slug', t.slug,
            'logo_url', t.logo_url,
            'color_primario', t.color_primario,
            'color_secundario', t.color_secundario,
            'plan', t.plan
        ) INTO tenant_config
        FROM public.tenants t
        WHERE t.id = user_tenant_id;

        IF tenant_config IS NOT NULL THEN
            claims := jsonb_set(claims, '{tenant_config}', tenant_config);
        END IF;
    END IF;

    -- Build geographic scope based on the most specific level available
    IF user_provincia_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{geographic_scope}', jsonb_build_object(
            'level', CASE
                WHEN user_circunscripcion_id IS NOT NULL THEN 'circunscripcion'
                WHEN user_municipio_id IS NOT NULL THEN 'municipio'
                ELSE 'provincia'
            END,
            'id', COALESCE(user_circunscripcion_id, user_municipio_id, user_provincia_id)
        ));
    ELSE
        claims := jsonb_set(claims, '{geographic_scope}', 'null'::jsonb);
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Grants remain the same as original migration
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- Grant SELECT on tenants to supabase_auth_admin so the hook can read tenant config
GRANT SELECT ON TABLE public.tenants TO supabase_auth_admin;


-- =============================================================================
-- STEP 8: Update protect_usuarios_columns trigger for platform_admin
-- =============================================================================
-- Platform admins should be able to modify protected columns (like admin).
-- Update the trigger to allow platform_admin same privileges as admin.

CREATE OR REPLACE FUNCTION public.protect_usuarios_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Only admin and platform_admin users can modify protected columns.
    -- Non-admin users have their protected columns silently reset to OLD values.
    IF (auth.jwt()->>'role') NOT IN ('admin', 'platform_admin') THEN
        NEW.role := OLD.role;
        NEW.tenant_id := OLD.tenant_id;
        NEW.provincia_id := OLD.provincia_id;
        NEW.municipio_id := OLD.municipio_id;
        NEW.circunscripcion_id := OLD.circunscripcion_id;
        NEW.estado := OLD.estado;
        NEW.auth_user_id := OLD.auth_user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
