-- =============================================================================
-- Migration: RLS JWT Fallback — Resilient Tenant & Role Resolution
-- =============================================================================
-- Problem:
--   The JWT custom_access_token_hook must be registered in the Supabase
--   Dashboard (Authentication > Hooks) to inject tenant_id, role, and
--   geographic_scope into the JWT. If the hook is NOT registered, the JWT
--   contains only standard claims (sub, aud, role="authenticated", exp).
--
--   When the hook is missing:
--     - get_my_tenant_id() returns NULL (no tenant_id claim in JWT)
--     - get_my_role() returns "authenticated" (standard claim, not app role)
--     - ALL RLS policies fail because tenant_id=NULL never matches
--     - The user sees ZERO data on every page
--
-- Fix:
--   1. Modify get_my_tenant_id() to fall back to a direct usuarios lookup
--      via auth.uid() when the JWT claim is absent. Since the function is
--      SECURITY DEFINER, it bypasses RLS and can read the usuarios table.
--
--   2. Modify get_my_role() to fall back to the usuarios table lookup when
--      the JWT role claim is "authenticated" (i.e., the hook did not run).
--
--   3. Modify get_my_scope_level() and get_my_scope_id() similarly.
--
--   4. Fix usuarios_select_own policy to allow self-read via auth.uid()
--      even when get_my_tenant_id() returns NULL (bootstrap path).
--
-- Performance note:
--   The fallback adds one extra query per request when the hook is not
--   registered. Once the hook is enabled in the Dashboard, the JWT claims
--   are present and the fallback is never triggered (fast path).
--
-- Rollback:
--   See "Down Migration" section at the bottom of this file.
-- =============================================================================


-- =============================================================================
-- 1. get_my_tenant_id() with fallback
-- =============================================================================
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


-- =============================================================================
-- 2. get_my_role() with fallback
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Fast path: read from JWT claim (present when hook is registered)
  v_role := auth.jwt()->>'role';

  -- Fallback: if the JWT role is the standard "authenticated" (hook did not
  -- inject the app-level role), look it up from the usuarios table.
  IF v_role IS NULL OR v_role = 'authenticated' THEN
    SELECT u.role::TEXT INTO v_role
    FROM public.usuarios u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- =============================================================================
-- 3. get_my_scope_level() with fallback
-- =============================================================================
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

  -- Fallback: compute from usuarios table
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
    -- If provincia_id is NULL, user has no geographic restriction (admin)
    -- v_level stays NULL which means "unrestricted"
  END IF;

  RETURN v_level;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- =============================================================================
-- 4. get_my_scope_id() with fallback
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

  -- Fallback: compute from usuarios table
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


-- =============================================================================
-- 5. Fix usuarios_select_own policy — add self-read escape hatch
-- =============================================================================
-- Current policy:
--   (tenant_id = get_my_tenant_id()) AND (get_my_role() = 'admin' OR auth_user_id = auth.uid())
--
-- Problem: tenant_id = get_my_tenant_id() fails when get_my_tenant_id()
-- returns NULL (before fallback). But now that get_my_tenant_id() HAS the
-- fallback, this policy should work. However, there is a chicken-and-egg
-- concern: get_my_tenant_id() reads from usuarios, but usuarios has RLS
-- that calls get_my_tenant_id(). Infinite recursion?
--
-- NO — because get_my_tenant_id() is SECURITY DEFINER. It runs as the
-- function owner (postgres/superuser), which bypasses RLS entirely.
-- The SELECT inside the function is NOT subject to RLS policies.
--
-- Therefore, the existing usuarios_select_own policy will now work
-- correctly because get_my_tenant_id() will successfully return the
-- tenant_id via the fallback path.
--
-- No change needed to the policy itself. The function fix is sufficient.
-- =============================================================================


-- =============================================================================
-- 6. Verify grants remain correct
-- =============================================================================
-- The functions were already granted to appropriate roles. CREATE OR REPLACE
-- preserves existing grants. But let us be explicit to be safe.
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_scope_level() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_scope_id() TO authenticated;


-- =============================================================================
-- Down Migration (Rollback)
-- =============================================================================
-- To roll back, restore the original simple implementations:
--
-- CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
-- RETURNS UUID AS $$
-- BEGIN
--   RETURN (auth.jwt()->>'tenant_id')::UUID;
-- END;
-- $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
--
-- CREATE OR REPLACE FUNCTION public.get_my_role()
-- RETURNS TEXT AS $$
-- BEGIN
--   RETURN auth.jwt()->>'role';
-- END;
-- $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
--
-- CREATE OR REPLACE FUNCTION public.get_my_scope_level()
-- RETURNS TEXT AS $$
-- BEGIN
--   RETURN auth.jwt()->'geographic_scope'->>'level';
-- END;
-- $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
--
-- CREATE OR REPLACE FUNCTION public.get_my_scope_id()
-- RETURNS UUID AS $$
-- BEGIN
--   RETURN (auth.jwt()->'geographic_scope'->>'id')::UUID;
-- END;
-- $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
-- =============================================================================
