-- =============================================================================
-- Migration: Fix clear_own_force_password_change blocked by trigger
-- =============================================================================
-- The protect_usuarios_sensitive_columns trigger reads the calling user's JWT
-- via get_my_role() even when invoked from a SECURITY DEFINER function.
-- This caused clear_own_force_password_change() to always raise a 400.
--
-- Fix: use a transaction-local session variable (is_local=true) as a signal
-- so the trigger can distinguish the authorized RPC path from a direct UPDATE.
-- The variable is scoped to the current transaction and cannot persist across
-- connections in Supabase's transaction-mode pool.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.clear_own_force_password_change()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.clearing_force_password_change', 'true', true);
  UPDATE usuarios
  SET force_password_change = false
  WHERE auth_user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_own_force_password_change() TO authenticated;

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
      -- Allow only when called from clear_own_force_password_change() RPC
      IF current_setting('app.clearing_force_password_change', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'permission denied: cannot change own force_password_change';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
