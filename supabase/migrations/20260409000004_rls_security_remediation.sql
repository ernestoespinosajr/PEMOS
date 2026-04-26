-- =============================================================================
-- Migration: RLS Security Remediation
-- =============================================================================
-- Addresses findings from Quinn's security review of RLS policies.
--
-- Fixes:
--   C-1: Privilege escalation via usuarios_update policy (CRITICAL)
--        -> BEFORE UPDATE trigger on usuarios that resets protected columns
--           for non-admin users.
--
--   I-1: Audit log INSERT policy too permissive
--        -> Drop the overly permissive audit_log_service_insert policy.
--           Service role bypasses RLS, so it can still insert.
--
--   I-2: Materialized views have no access controls
--        -> REVOKE ALL from anon/PUBLIC, GRANT SELECT to authenticated only.
--
--   I-3: refresh_materialized_views() callable by PUBLIC
--        -> REVOKE EXECUTE from PUBLIC/anon/authenticated.
--
--   M-3: SECURITY DEFINER functions missing SET search_path
--        -> ALTER FUNCTION ... SET search_path = public for all 10 RLS
--           helper functions, the JWT claims hook, and the refresh function.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS protect_usuarios_columns_trigger ON public.usuarios;
--   DROP FUNCTION IF EXISTS public.protect_usuarios_columns();
--   -- Re-create the audit log insert policy:
--   CREATE POLICY "audit_log_service_insert" ON auth_audit_log
--     FOR INSERT TO authenticated WITH CHECK (true);
--   -- Re-grant materialized view access to PUBLIC:
--   GRANT ALL ON mv_member_count_by_provincia TO anon, PUBLIC;
--   GRANT ALL ON mv_member_count_by_municipio TO anon, PUBLIC;
--   GRANT ALL ON mv_vote_totals_by_partido TO anon, PUBLIC;
--   GRANT ALL ON mv_vote_totals_by_recinto TO anon, PUBLIC;
--   -- Re-grant refresh function to PUBLIC:
--   GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO PUBLIC;
--   -- Remove search_path settings (ALTER FUNCTION ... RESET search_path):
--   ALTER FUNCTION public.get_my_tenant_id() RESET search_path;
--   ALTER FUNCTION public.get_my_role() RESET search_path;
--   ALTER FUNCTION public.get_my_scope_level() RESET search_path;
--   ALTER FUNCTION public.get_my_scope_id() RESET search_path;
--   ALTER FUNCTION public.resolve_sector_provincia_id(UUID) RESET search_path;
--   ALTER FUNCTION public.resolve_sector_municipio_id(UUID) RESET search_path;
--   ALTER FUNCTION public.resolve_sector_circunscripcion_id(UUID) RESET search_path;
--   ALTER FUNCTION public.is_within_scope_via_sector(UUID) RESET search_path;
--   ALTER FUNCTION public.is_within_scope_via_recinto(UUID) RESET search_path;
--   ALTER FUNCTION public.is_within_scope_cronograma(TEXT, UUID) RESET search_path;
--   ALTER FUNCTION public.custom_access_token_hook(JSONB) RESET search_path;
--   ALTER FUNCTION public.refresh_materialized_views() RESET search_path;
-- =============================================================================


-- =============================================================================
-- C-1: CRITICAL — Privilege Escalation via usuarios_update Policy
-- =============================================================================
-- The usuarios_update RLS policy allows any authenticated user to UPDATE their
-- own row with no column restriction. A malicious user could execute:
--   UPDATE usuarios SET role = 'admin' WHERE auth_user_id = auth.uid();
-- and escalate to admin.
--
-- Fix: A BEFORE UPDATE trigger that resets protected columns (role, tenant_id,
-- provincia_id, municipio_id, circunscripcion_id, estado, auth_user_id) to
-- their OLD values when the requesting user is NOT an admin.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_usuarios_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Only admin users can modify protected columns.
  -- Non-admin users have their protected columns silently reset to OLD values.
  IF (auth.jwt()->>'role') != 'admin' THEN
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

CREATE TRIGGER protect_usuarios_columns_trigger
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_usuarios_columns();


-- =============================================================================
-- I-1: Audit Log INSERT Policy Too Permissive
-- =============================================================================
-- The audit_log_service_insert policy grants INSERT to any authenticated user
-- with WITH CHECK (true). Since the service role already bypasses RLS, this
-- policy only opens the door for injecting fake audit entries from the client.
--
-- Fix: Drop the policy. Service role inserts still work (RLS bypass).
-- =============================================================================

DROP POLICY IF EXISTS "audit_log_service_insert" ON public.auth_audit_log;

-- Also revoke INSERT from authenticated since there is no longer a policy
-- allowing it. This prevents the grant from being misleading.
REVOKE INSERT ON public.auth_audit_log FROM authenticated;


-- =============================================================================
-- I-2: Materialized Views Have No Access Controls
-- =============================================================================
-- Materialized views do not support RLS. Without explicit REVOKE/GRANT,
-- they inherit default privileges, potentially exposing aggregate data to
-- anon and PUBLIC roles.
--
-- Fix: Revoke all access from anon/PUBLIC, grant SELECT to authenticated only.
-- Note: This does not solve cross-tenant exposure within the authenticated
-- role (materialized views aggregate across tenants). A full fix would replace
-- these with tenant-filtered views or functions — tracked separately.
-- =============================================================================

REVOKE ALL ON mv_member_count_by_provincia FROM anon, PUBLIC;
REVOKE ALL ON mv_member_count_by_municipio FROM anon, PUBLIC;
REVOKE ALL ON mv_vote_totals_by_partido FROM anon, PUBLIC;
REVOKE ALL ON mv_vote_totals_by_recinto FROM anon, PUBLIC;

GRANT SELECT ON mv_member_count_by_provincia TO authenticated;
GRANT SELECT ON mv_member_count_by_municipio TO authenticated;
GRANT SELECT ON mv_vote_totals_by_partido TO authenticated;
GRANT SELECT ON mv_vote_totals_by_recinto TO authenticated;


-- =============================================================================
-- I-3: refresh_materialized_views() Callable by PUBLIC
-- =============================================================================
-- The SECURITY DEFINER function refresh_materialized_views() has no REVOKE
-- statements. Any role (including anon) could call it, triggering expensive
-- REFRESH MATERIALIZED VIEW CONCURRENTLY operations.
--
-- Fix: Revoke from PUBLIC, anon, and authenticated. Only service_role or
-- postgres (used by Edge Functions and pg_cron) should call this.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM authenticated;


-- =============================================================================
-- M-3: SECURITY DEFINER Functions Missing SET search_path
-- =============================================================================
-- All SECURITY DEFINER functions should have SET search_path = public to
-- prevent search-path hijacking attacks. An attacker who can create objects
-- in a schema that appears earlier in the search path could shadow public
-- functions/tables and execute code under the definer's elevated privileges.
--
-- Fix: ALTER FUNCTION ... SET search_path = public for all affected functions.
-- =============================================================================

-- 10 RLS helper functions from 20260409000002_create_rls_policies.sql
ALTER FUNCTION public.get_my_tenant_id() SET search_path = public;
ALTER FUNCTION public.get_my_role() SET search_path = public;
ALTER FUNCTION public.get_my_scope_level() SET search_path = public;
ALTER FUNCTION public.get_my_scope_id() SET search_path = public;
ALTER FUNCTION public.resolve_sector_provincia_id(UUID) SET search_path = public;
ALTER FUNCTION public.resolve_sector_municipio_id(UUID) SET search_path = public;
ALTER FUNCTION public.resolve_sector_circunscripcion_id(UUID) SET search_path = public;
ALTER FUNCTION public.is_within_scope_via_sector(UUID) SET search_path = public;
ALTER FUNCTION public.is_within_scope_via_recinto(UUID) SET search_path = public;
ALTER FUNCTION public.is_within_scope_cronograma(TEXT, UUID) SET search_path = public;

-- JWT custom claims hook from 20260409000001_jwt_custom_claims_hook.sql
ALTER FUNCTION public.custom_access_token_hook(JSONB) SET search_path = public;

-- Materialized view refresh function from 20260408234055_create_materialized_views.sql
ALTER FUNCTION public.refresh_materialized_views() SET search_path = public;
