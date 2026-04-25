-- =============================================================================
-- Migration: Fix JWT role Claim Collision (CRITICAL BUG FIX)
-- =============================================================================
-- Problem:
--   The custom_access_token_hook overwrites the JWT 'role' claim with the
--   application role (e.g., 'admin', 'coordinator'). PostgREST uses 'role'
--   to SET ROLE in Postgres. When it receives 'admin' instead of
--   'authenticated', Postgres throws: role "admin" does not exist.
--   Result: EVERY API call returns 401.
--
-- Fix:
--   1. Update custom_access_token_hook to store the app role in 'app_role'
--      instead of 'role'. The JWT 'role' claim stays as 'authenticated'.
--
--   2. Update get_my_role() to read from 'app_role' instead of 'role'.
--
--   3. Update is_platform_admin() to read from 'app_role'.
--
--   4. Update protect_usuarios_columns() to read from 'app_role'.
--
--   5. Update provision_tenant() to read from 'app_role'.
--
--   6. Update get_tenant_usage_stats() to read from 'app_role'.
--
--   7. Update RLS policies (audit_log, miembros_audit) that directly
--      read auth.jwt()->>'role' to use 'app_role'.
--
-- Rollback:
--   See "Down Migration" section at the bottom of this file.
-- =============================================================================


-- =============================================================================
-- 1. Fix custom_access_token_hook — use 'app_role' instead of 'role'
-- =============================================================================

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

    -- Check if tenant is active (skip for platform_admin — they always have access)
    IF user_role != 'platform_admin' AND user_tenant_id IS NOT NULL THEN
        SELECT t.activo INTO tenant_activo
        FROM public.tenants t
        WHERE t.id = user_tenant_id;

        -- If tenant is suspended/inactive, block the login by returning
        -- claims with a suspended flag. The application layer checks this.
        IF tenant_activo IS NOT TRUE THEN
            claims := event->'claims';
            -- FIX: Use 'app_role' instead of 'role' to avoid PostgREST collision
            claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
            claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));
            claims := jsonb_set(claims, '{tenant_suspended}', 'true'::jsonb);
            event := jsonb_set(event, '{claims}', claims);
            RETURN event;
        END IF;
    END IF;

    -- Build claims from existing token claims
    claims := event->'claims';

    -- FIX: Inject app_role (NOT 'role') and tenant_id
    -- The 'role' claim MUST remain 'authenticated' for PostgREST to function.
    claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
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

-- Preserve grants
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
GRANT SELECT ON TABLE public.usuarios TO supabase_auth_admin;
GRANT SELECT ON TABLE public.tenants TO supabase_auth_admin;


-- =============================================================================
-- 2. Fix get_my_role() — read from 'app_role' instead of 'role'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Fast path: read from JWT 'app_role' claim (set by the hook)
  v_role := auth.jwt()->>'app_role';

  -- Fallback: if the JWT has no app_role claim (hook not registered or
  -- user has not re-authenticated since the fix), look it up from usuarios.
  IF v_role IS NULL THEN
    SELECT u.role::TEXT INTO v_role
    FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;


-- =============================================================================
-- 3. Fix is_platform_admin() — read from 'app_role' instead of 'role'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
    -- Use app_role claim, with fallback to usuarios table
    v_role := auth.jwt()->>'app_role';
    IF v_role IS NULL THEN
        SELECT u.role::TEXT INTO v_role
        FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid()
        LIMIT 1;
    END IF;
    RETURN v_role = 'platform_admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon, PUBLIC;


-- =============================================================================
-- 4. Fix protect_usuarios_columns() — read from 'app_role' instead of 'role'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_usuarios_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
    -- Resolve the app role via app_role claim, with fallback
    v_role := auth.jwt()->>'app_role';
    IF v_role IS NULL THEN
        SELECT u.role::TEXT INTO v_role
        FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid()
        LIMIT 1;
    END IF;

    -- Only admin and platform_admin users can modify protected columns.
    -- Non-admin users have their protected columns silently reset to OLD values.
    IF v_role NOT IN ('admin', 'platform_admin') THEN
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


-- =============================================================================
-- 5. Fix provision_tenant() — read from 'app_role' instead of 'role'
-- =============================================================================
-- We only need to fix the authorization check at the top. The rest of the
-- function remains unchanged, so we re-create the full function.

-- First, read and re-create. Since the function body is large, we only
-- replace the role-reading line. CREATE OR REPLACE handles this.

CREATE OR REPLACE FUNCTION public.provision_tenant(
    p_nombre TEXT,
    p_slug TEXT,
    p_admin_email TEXT,
    p_admin_nombre TEXT,
    p_plan TEXT DEFAULT 'basico'
)
RETURNS UUID AS $$
DECLARE
    v_new_tenant_id UUID;
    v_caller_role TEXT;
    v_max_usuarios INTEGER;
    v_max_miembros INTEGER;
BEGIN
    -- Authorization check: only platform_admin can provision tenants
    -- FIX: Read from app_role with fallback
    v_caller_role := auth.jwt()->>'app_role';
    IF v_caller_role IS NULL THEN
        SELECT u.role::TEXT INTO v_caller_role
        FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid()
        LIMIT 1;
    END IF;

    IF v_caller_role != 'platform_admin' THEN
        RAISE EXCEPTION 'Only platform_admin can provision tenants'
            USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;

    -- Validate inputs
    IF p_nombre IS NULL OR trim(p_nombre) = '' THEN
        RAISE EXCEPTION 'Tenant name (p_nombre) is required'
            USING ERRCODE = '22023'; -- invalid_parameter_value
    END IF;

    IF p_slug IS NULL OR trim(p_slug) = '' THEN
        RAISE EXCEPTION 'Tenant slug (p_slug) is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_admin_email IS NULL OR trim(p_admin_email) = '' THEN
        RAISE EXCEPTION 'Admin email (p_admin_email) is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_admin_nombre IS NULL OR trim(p_admin_nombre) = '' THEN
        RAISE EXCEPTION 'Admin name (p_admin_nombre) is required'
            USING ERRCODE = '22023';
    END IF;

    -- Validate plan
    IF p_plan NOT IN ('basico', 'profesional', 'empresarial') THEN
        RAISE EXCEPTION 'Invalid plan: %. Must be basico, profesional, or empresarial', p_plan
            USING ERRCODE = '22023';
    END IF;

    -- Set limits based on plan
    CASE p_plan
        WHEN 'basico' THEN
            v_max_usuarios := 50;
            v_max_miembros := 10000;
        WHEN 'profesional' THEN
            v_max_usuarios := 200;
            v_max_miembros := 50000;
        WHEN 'empresarial' THEN
            v_max_usuarios := 1000;
            v_max_miembros := 500000;
    END CASE;

    -- Check slug uniqueness (friendlier error than the DB constraint)
    IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Tenant slug "%" already exists', p_slug
            USING ERRCODE = '23505'; -- unique_violation
    END IF;

    -- Step 1: Create tenant record
    INSERT INTO tenants (nombre, slug, plan, max_usuarios, max_miembros)
    VALUES (p_nombre, p_slug, p_plan, v_max_usuarios, v_max_miembros)
    RETURNING id INTO v_new_tenant_id;

    -- Step 2: Create initial admin user record
    -- Note: auth_user_id is NULL because the Auth user hasn't been created yet.
    -- The Edge Function will create the Auth user, then UPDATE this record
    -- with the auth_user_id.
    INSERT INTO usuarios (
        nombre,
        apellido,
        email,
        role,
        tenant_id,
        estado
    ) VALUES (
        p_admin_nombre,
        '',
        p_admin_email,
        'admin'::role_usuario,
        v_new_tenant_id,
        true
    );

    RETURN v_new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.provision_tenant(TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, PUBLIC;


-- =============================================================================
-- 6. Fix get_tenant_usage_stats() — read from 'app_role' instead of 'role'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_usage_stats()
RETURNS TABLE (
    tenant_id UUID,
    tenant_nombre TEXT,
    tenant_slug TEXT,
    tenant_plan TEXT,
    tenant_activo BOOLEAN,
    max_usuarios INTEGER,
    max_miembros INTEGER,
    usuario_count BIGINT,
    miembro_count BIGINT,
    recinto_count BIGINT,
    candidato_voto_count BIGINT,
    acta_count BIGINT,
    tenant_created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_tenant_id UUID;
BEGIN
    -- FIX: Read from app_role with fallback
    v_caller_role := auth.jwt()->>'app_role';
    IF v_caller_role IS NULL THEN
        SELECT u.role::TEXT INTO v_caller_role
        FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid()
        LIMIT 1;
    END IF;
    v_caller_tenant_id := (auth.jwt()->>'tenant_id')::UUID;
    IF v_caller_tenant_id IS NULL THEN
        SELECT u.tenant_id INTO v_caller_tenant_id
        FROM public.usuarios u
        WHERE u.auth_user_id = auth.uid()
        LIMIT 1;
    END IF;

    -- Platform admin: return all tenants
    IF v_caller_role = 'platform_admin' THEN
        RETURN QUERY
        SELECT
            mv.tenant_id,
            mv.tenant_nombre,
            mv.tenant_slug,
            mv.tenant_plan,
            mv.tenant_activo,
            mv.max_usuarios,
            mv.max_miembros,
            mv.usuario_count,
            mv.miembro_count,
            mv.recinto_count,
            mv.candidato_voto_count,
            mv.acta_count,
            mv.tenant_created_at
        FROM mv_tenant_usage_stats mv
        ORDER BY mv.tenant_nombre;
        RETURN;
    END IF;

    -- Regular admin: return only their own tenant's stats
    IF v_caller_role = 'admin' AND v_caller_tenant_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            mv.tenant_id,
            mv.tenant_nombre,
            mv.tenant_slug,
            mv.tenant_plan,
            mv.tenant_activo,
            mv.max_usuarios,
            mv.max_miembros,
            mv.usuario_count,
            mv.miembro_count,
            mv.recinto_count,
            mv.candidato_voto_count,
            mv.acta_count,
            mv.tenant_created_at
        FROM mv_tenant_usage_stats mv
        WHERE mv.tenant_id = v_caller_tenant_id;
        RETURN;
    END IF;

    -- Non-admin users: return no data
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_tenant_usage_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_tenant_usage_stats() FROM anon, PUBLIC;


-- =============================================================================
-- 7. Fix get_my_scope_level() — ensure it reads app_role for fallback check
-- =============================================================================
-- The current fallback checks (auth.jwt()->>'tenant_id') IS NULL to decide
-- whether to fall back. This is fine — tenant_id is a custom claim that only
-- exists when the hook runs. No change needed here since it does not read 'role'.
-- Keeping the same logic but re-stating for completeness.

CREATE OR REPLACE FUNCTION public.get_my_scope_level()
RETURNS TEXT AS $$
DECLARE
  v_level TEXT;
  v_provincia_id UUID;
  v_municipio_id UUID;
  v_circunscripcion_id UUID;
BEGIN
  -- Fast path: read from JWT claim
  v_level := auth.jwt()->'geographic_scope'->>'level';

  -- Fallback: compute from usuarios table when hook has not run
  IF v_level IS NULL AND (auth.jwt()->>'tenant_id') IS NULL THEN
    SELECT u.provincia_id, u.municipio_id, u.circunscripcion_id
    INTO v_provincia_id, v_municipio_id, v_circunscripcion_id
    FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;

    IF v_provincia_id IS NOT NULL THEN
      v_level := CASE
        WHEN v_circunscripcion_id IS NOT NULL THEN 'circunscripcion'
        WHEN v_municipio_id IS NOT NULL THEN 'municipio'
        ELSE 'provincia'
      END;
    END IF;
  END IF;

  RETURN v_level;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_scope_level() TO authenticated;


-- =============================================================================
-- 8. Fix get_my_scope_id() — same treatment as scope_level
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_scope_id()
RETURNS UUID AS $$
DECLARE
  v_scope_id UUID;
  v_provincia_id UUID;
  v_municipio_id UUID;
  v_circunscripcion_id UUID;
BEGIN
  -- Fast path: read from JWT claim
  v_scope_id := (auth.jwt()->'geographic_scope'->>'id')::UUID;

  -- Fallback: compute from usuarios table when hook has not run
  IF v_scope_id IS NULL AND (auth.jwt()->>'tenant_id') IS NULL THEN
    SELECT u.provincia_id, u.municipio_id, u.circunscripcion_id
    INTO v_provincia_id, v_municipio_id, v_circunscripcion_id
    FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;

    v_scope_id := COALESCE(v_circunscripcion_id, v_municipio_id, v_provincia_id);
  END IF;

  RETURN v_scope_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_scope_id() TO authenticated;


-- =============================================================================
-- 9. Fix RLS policy: audit_log_admin_select
-- =============================================================================
-- This policy directly reads auth.jwt()->>'role'. We need to use get_my_role()
-- instead, which now correctly reads app_role.

DROP POLICY IF EXISTS "audit_log_admin_select" ON auth_audit_log;

CREATE POLICY "audit_log_admin_select"
  ON auth_audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND tenant_id = public.get_my_tenant_id()
  );


-- =============================================================================
-- 10. Fix RLS policy: miembros_audit_admin_select
-- =============================================================================
-- Same issue — directly reads auth.jwt()->>'role'.

DROP POLICY IF EXISTS "miembros_audit_admin_select" ON miembros_audit;

CREATE POLICY "miembros_audit_admin_select"
  ON miembros_audit
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND tenant_id = public.get_my_tenant_id()
  );


-- =============================================================================
-- 11. Fix get_my_tenant_id() — preserve existing fallback logic
-- =============================================================================
-- This function reads 'tenant_id' (not 'role') from JWT, so no collision.
-- Re-stating it to ensure the fallback path is present and consistent.

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Fast path: read from JWT claim (present when hook is registered)
  v_tenant_id := (auth.jwt()->>'tenant_id')::UUID;

  -- Fallback: if the JWT has no tenant_id, look it up from usuarios
  IF v_tenant_id IS NULL THEN
    SELECT u.tenant_id INTO v_tenant_id
    FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;


-- =============================================================================
-- Down Migration (Rollback)
-- =============================================================================
-- To revert this fix (re-introduce the bug, NOT recommended):
--
-- 1. Restore custom_access_token_hook to use '{role}' instead of '{app_role}'
-- 2. Restore get_my_role() to read auth.jwt()->>'role'
-- 3. Restore is_platform_admin() to read auth.jwt()->>'role'
-- 4. Restore protect_usuarios_columns() to read auth.jwt()->>'role'
-- 5. Restore provision_tenant() to read auth.jwt()->>'role'
-- 6. Restore get_tenant_usage_stats() to read auth.jwt()->>'role'
-- 7. Restore audit_log_admin_select policy to use auth.jwt()->>'role'
-- 8. Restore miembros_audit_admin_select policy to use auth.jwt()->>'role'
--
-- This is the exact reverse of this migration. Since this fixes a critical
-- production bug, rolling back should only be done if the fix itself causes
-- a regression.
-- =============================================================================
