-- =============================================================================
-- Migration: Quality Review Remediation (ftr-011 C-2, M-1, M-3)
-- =============================================================================
-- Fixes identified by Quinn's quality review of ftr-011:
--
--   C-2: Add missing cross-tenant FK validation triggers on partido_votos
--        and actas tables (matching pattern from 20260410000010).
--
--   M-1: Revoke direct SELECT on mv_tenant_usage_stats from authenticated
--        and create a wrapper RPC get_tenant_usage_stats() that enforces
--        platform_admin / own-tenant access control.
--
--   M-3: Harden geographic table INSERT policies to prevent tenant admins
--        from inserting rows with tenant_id IS NULL (shared data injection).
--        Only platform_admin may insert NULL tenant_id rows.
--
-- Rollback:
--   -- C-2 rollback
--   DROP TRIGGER IF EXISTS trg_validate_partido_votos_tenant_fk ON partido_votos;
--   DROP TRIGGER IF EXISTS trg_validate_actas_tenant_fk ON actas;
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_partido_votos_tenant_fk();
--   DROP FUNCTION IF EXISTS public.trg_fn_validate_actas_tenant_fk();
--
--   -- M-1 rollback
--   DROP FUNCTION IF EXISTS public.get_tenant_usage_stats();
--   GRANT SELECT ON mv_tenant_usage_stats TO authenticated;
--
--   -- M-3 rollback: restore original INSERT policies (with OR tenant_id IS NULL)
--   DROP POLICY IF EXISTS "provincias_insert_admin" ON provincias;
--   CREATE POLICY "provincias_insert_admin" ON provincias FOR INSERT TO authenticated
--     WITH CHECK (get_my_role() = 'admin' AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL));
--   DROP POLICY IF EXISTS "municipios_insert_admin" ON municipios;
--   CREATE POLICY "municipios_insert_admin" ON municipios FOR INSERT TO authenticated
--     WITH CHECK (get_my_role() = 'admin' AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL));
--   DROP POLICY IF EXISTS "circunscripciones_insert_admin" ON circunscripciones;
--   CREATE POLICY "circunscripciones_insert_admin" ON circunscripciones FOR INSERT TO authenticated
--     WITH CHECK (get_my_role() = 'admin' AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL));
--   DROP POLICY IF EXISTS "sectores_insert_admin" ON sectores;
--   CREATE POLICY "sectores_insert_admin" ON sectores FOR INSERT TO authenticated
--     WITH CHECK (get_my_role() = 'admin' AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL));
--   DROP POLICY IF EXISTS "comites_insert_admin" ON comites;
--   CREATE POLICY "comites_insert_admin" ON comites FOR INSERT TO authenticated
--     WITH CHECK (get_my_role() = 'admin' AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL));
--   DROP POLICY IF EXISTS "niveles_intermedios_insert_admin" ON niveles_intermedios;
--   CREATE POLICY "niveles_intermedios_insert_admin" ON niveles_intermedios FOR INSERT TO authenticated
--     WITH CHECK (get_my_role() = 'admin' AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL));
-- =============================================================================


-- =============================================================================
-- FIX C-2: Cross-tenant FK validation triggers on partido_votos and actas
-- =============================================================================
-- These two sensitive electoral tables were missed in migration 000010.
-- partido_votos has FK refs: recinto_id, colegio_id, partido_id, periodo_id
-- actas has FK refs: recinto_id, colegio_id, periodo_id, partido_id
-- =============================================================================

-- ---------------------------------------------------------------------------
-- partido_votos: validate recinto_id, colegio_id, partido_id, periodo_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_partido_votos_tenant_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.verify_same_tenant_fk('recintos', NEW.recinto_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: recinto_id (%) belongs to a different tenant', NEW.recinto_id
            USING ERRCODE = '23503'; -- foreign_key_violation
    END IF;

    IF NOT public.verify_same_tenant_fk('colegios', NEW.colegio_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: colegio_id (%) belongs to a different tenant', NEW.colegio_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('partidos', NEW.partido_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: partido_id (%) belongs to a different tenant', NEW.partido_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('periodos_electorales', NEW.periodo_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: periodo_id (%) belongs to a different tenant', NEW.periodo_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_partido_votos_tenant_fk
    BEFORE INSERT OR UPDATE ON partido_votos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_partido_votos_tenant_fk();

-- ---------------------------------------------------------------------------
-- actas: validate recinto_id, colegio_id, periodo_id, partido_id
-- Note: actas is designed as append-only (no updated_at), but the trigger
-- covers UPDATE as well for defense-in-depth (admin corrections, etc.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_validate_actas_tenant_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT public.verify_same_tenant_fk('recintos', NEW.recinto_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: recinto_id (%) belongs to a different tenant', NEW.recinto_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('colegios', NEW.colegio_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: colegio_id (%) belongs to a different tenant', NEW.colegio_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('periodos_electorales', NEW.periodo_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: periodo_id (%) belongs to a different tenant', NEW.periodo_id
            USING ERRCODE = '23503';
    END IF;

    IF NOT public.verify_same_tenant_fk('partidos', NEW.partido_id, NEW.tenant_id) THEN
        RAISE EXCEPTION 'Cross-tenant reference: partido_id (%) belongs to a different tenant', NEW.partido_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_validate_actas_tenant_fk
    BEFORE INSERT OR UPDATE ON actas
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validate_actas_tenant_fk();


-- =============================================================================
-- FIX M-1: Restrict mv_tenant_usage_stats to platform_admin via RPC wrapper
-- =============================================================================
-- The materialized view was GRANT SELECT to authenticated, which leaks
-- tenant names, plans, and usage metrics to all authenticated users.
-- Fix: REVOKE direct access and create a SECURITY DEFINER wrapper function
-- that enforces role-based access.
-- =============================================================================

-- Revoke direct SELECT from authenticated users
REVOKE SELECT ON mv_tenant_usage_stats FROM authenticated;

-- Create wrapper RPC function with role-based access control
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
    v_caller_role := auth.jwt()->>'role';
    v_caller_tenant_id := (auth.jwt()->>'tenant_id')::UUID;

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

    -- All other roles: return nothing (empty result set)
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Grant RPC access to authenticated (role check is inside the function)
GRANT EXECUTE ON FUNCTION public.get_tenant_usage_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_tenant_usage_stats() FROM anon, PUBLIC;


-- =============================================================================
-- FIX M-3: Harden geographic table INSERT policies against NULL tenant_id
-- =============================================================================
-- The original INSERT policies allowed any admin to insert rows with
-- tenant_id IS NULL, creating "shared" data visible to all tenants.
-- Fix: Only platform_admin can insert NULL tenant_id rows.
-- Regular tenant admins must insert with their own tenant_id.
--
-- Affected tables: provincias, municipios, circunscripciones, sectores,
--                  comites, niveles_intermedios
--
-- Note: SELECT, UPDATE, and DELETE policies still allow access to
-- tenant_id IS NULL rows (shared reference data). Only INSERT is restricted.
-- =============================================================================

-- ---- PROVINCIAS ----
DROP POLICY IF EXISTS "provincias_insert_admin" ON provincias;
CREATE POLICY "provincias_insert_admin"
  ON provincias FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (
      tenant_id = public.get_my_tenant_id()
      OR (tenant_id IS NULL AND public.is_platform_admin())
    )
  );

-- ---- MUNICIPIOS ----
DROP POLICY IF EXISTS "municipios_insert_admin" ON municipios;
CREATE POLICY "municipios_insert_admin"
  ON municipios FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (
      tenant_id = public.get_my_tenant_id()
      OR (tenant_id IS NULL AND public.is_platform_admin())
    )
  );

-- ---- CIRCUNSCRIPCIONES ----
DROP POLICY IF EXISTS "circunscripciones_insert_admin" ON circunscripciones;
CREATE POLICY "circunscripciones_insert_admin"
  ON circunscripciones FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (
      tenant_id = public.get_my_tenant_id()
      OR (tenant_id IS NULL AND public.is_platform_admin())
    )
  );

-- ---- SECTORES ----
DROP POLICY IF EXISTS "sectores_insert_admin" ON sectores;
CREATE POLICY "sectores_insert_admin"
  ON sectores FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (
      tenant_id = public.get_my_tenant_id()
      OR (tenant_id IS NULL AND public.is_platform_admin())
    )
  );

-- ---- COMITES ----
DROP POLICY IF EXISTS "comites_insert_admin" ON comites;
CREATE POLICY "comites_insert_admin"
  ON comites FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (
      tenant_id = public.get_my_tenant_id()
      OR (tenant_id IS NULL AND public.is_platform_admin())
    )
  );

-- ---- NIVELES_INTERMEDIOS ----
DROP POLICY IF EXISTS "niveles_intermedios_insert_admin" ON niveles_intermedios;
CREATE POLICY "niveles_intermedios_insert_admin"
  ON niveles_intermedios FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (
      tenant_id = public.get_my_tenant_id()
      OR (tenant_id IS NULL AND public.is_platform_admin())
    )
  );
