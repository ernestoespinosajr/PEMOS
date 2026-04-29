-- =============================================================================
-- Migration: Security Remediation — movimientos feature review (Quinn F4a/F4b/F8)
-- =============================================================================
-- Addresses findings from Quinn's security review of the movimientos feature.
--
-- Fixes:
--   F4a (CRITICAL): Replace permissive usuarios_update RLS policy with two
--         targeted policies: admin full access + constrained self-service update.
--         The self-service policy blocks mutation of role, movimiento_id,
--         tenant_id, auth_user_id, and force_password_change.
--
--   F4b (CRITICAL support): Add clear_own_force_password_change() SECURITY
--         DEFINER RPC so the update-password page can clear the flag without
--         requiring broad self-update privileges on sensitive columns.
--
--   F8  (IMPORTANT): Replace movimientos_select policy to remove observer and
--         unscoped-role list access. Only admin, scoped users (own movimiento),
--         and unscoped coordinator/field_worker may list movimientos.
--
-- Rollback:
--   DROP POLICY IF EXISTS "usuarios_update_admin" ON usuarios;
--   DROP POLICY IF EXISTS "usuarios_update_self" ON usuarios;
--   -- Restore original combined policy from 20260409000002:
--   CREATE POLICY "usuarios_update"
--     ON usuarios FOR UPDATE TO authenticated
--     USING (
--       tenant_id = public.get_my_tenant_id()
--       AND (public.get_my_role() = 'admin' OR auth_user_id = auth.uid())
--     )
--     WITH CHECK (
--       tenant_id = public.get_my_tenant_id()
--       AND (public.get_my_role() = 'admin' OR auth_user_id = auth.uid())
--     );
--
--   DROP FUNCTION IF EXISTS public.clear_own_force_password_change();
--
--   DROP POLICY IF EXISTS "movimientos_select" ON movimientos;
--   -- Restore original policy from 20260428000002:
--   CREATE POLICY "movimientos_select" ON movimientos FOR SELECT
--     TO authenticated
--     USING (
--       public.is_platform_admin()
--       OR (
--         tenant_id = public.get_my_tenant_id()
--         AND (
--           public.get_my_role() = 'admin'
--           OR (
--             public.get_my_movimiento_id() IS NOT NULL
--             AND id = public.get_my_movimiento_id()
--           )
--           OR public.get_my_movimiento_id() IS NULL
--         )
--       )
--     );
-- =============================================================================


-- =============================================================================
-- F4a: Replace usuarios_update with two scoped policies
-- =============================================================================
-- The original usuarios_update policy (20260409000002) allowed any user to
-- UPDATE their own row with no column restrictions. Even with the
-- protect_usuarios_columns() trigger in place, that trigger does not guard
-- movimiento_id or force_password_change. Splitting into two policies makes
-- the column restriction explicit and enforceable at the RLS layer.

DROP POLICY IF EXISTS "usuarios_update" ON usuarios;

-- Admin full access: tenant admin and platform admin may update any column
-- on any user within their tenant (or all tenants for platform_admin).
CREATE POLICY "usuarios_update_admin"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      tenant_id = public.get_my_tenant_id()
      AND public.get_my_role() = 'admin'
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      tenant_id = public.get_my_tenant_id()
      AND public.get_my_role() = 'admin'
    )
  );

-- Self-service profile update: non-admin users may update their own row.
-- Column-level restrictions on sensitive fields are enforced by the
-- trg_protect_usuarios_sensitive_columns trigger below (NEW/OLD are only
-- available in trigger functions, not in RLS WITH CHECK expressions).
CREATE POLICY "usuarios_update_self"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    AND tenant_id = public.get_my_tenant_id()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    AND tenant_id = public.get_my_tenant_id()
  );

-- Trigger to block self-modification of sensitive columns.
-- Fires BEFORE UPDATE so the change never reaches the table.
-- Admins and platform_admins are exempt (they use the admin policy path).
CREATE OR REPLACE FUNCTION public.protect_usuarios_sensitive_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF public.get_my_role() NOT IN ('admin', 'platform_admin') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'permission denied: cannot change own role';
    END IF;
    IF NEW.movimiento_id IS DISTINCT FROM OLD.movimiento_id THEN
      RAISE EXCEPTION 'permission denied: cannot change own movimiento_id';
    END IF;
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'permission denied: cannot change own tenant_id';
    END IF;
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'permission denied: cannot change own auth_user_id';
    END IF;
    IF NEW.force_password_change IS DISTINCT FROM OLD.force_password_change THEN
      RAISE EXCEPTION 'permission denied: cannot change own force_password_change';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_usuarios_sensitive_columns ON usuarios;
CREATE TRIGGER trg_protect_usuarios_sensitive_columns
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_usuarios_sensitive_columns();


-- =============================================================================
-- F4b: clear_own_force_password_change() — narrow SECURITY DEFINER RPC
-- =============================================================================
-- Allows the update-password page to clear force_password_change after a
-- successful user-initiated password change without granting the user write
-- access to that column via RLS. This function operates as the table owner
-- (SECURITY DEFINER) and clears ONLY force_password_change for auth.uid().
-- It cannot be used to modify any other column or any other user's row.

CREATE OR REPLACE FUNCTION public.clear_own_force_password_change()
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  UPDATE usuarios
  SET force_password_change = false
  WHERE auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.clear_own_force_password_change() TO authenticated;


-- =============================================================================
-- F8: Restrict movimientos_select — remove observer and unscoped list access
-- =============================================================================
-- The previous policy (20260428000002) had a third branch:
--   OR public.get_my_movimiento_id() IS NULL
-- which granted any authenticated user without a movimiento scope (including
-- observer role) full SELECT access to list all movimientos in their tenant.
-- Observers do not need movimiento metadata. Unscoped list access is now
-- restricted to coordinator and field_worker roles only.

DROP POLICY IF EXISTS "movimientos_select" ON movimientos;

CREATE POLICY "movimientos_select"
  ON movimientos FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      tenant_id = public.get_my_tenant_id()
      AND (
        public.get_my_role() = 'admin'
        OR (
          public.get_my_movimiento_id() IS NOT NULL
          AND id = public.get_my_movimiento_id()
        )
        OR (
          public.get_my_movimiento_id() IS NULL
          AND public.get_my_role() IN ('coordinator', 'field_worker')
        )
      )
    )
  );
