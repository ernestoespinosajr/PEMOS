-- Migration: Fix get_member_counts varchar/text type mismatch
-- Issue: The function's RETURNS TABLE defines geo_nombre as TEXT,
-- but the underlying mv_member_counts table stores it as VARCHAR(100).
-- PostgreSQL's RETURN QUERY enforces exact type matching, causing:
--   ERROR 42804: structure of query does not match function result type
--   DETAIL: Returned type character varying(100) does not match expected type text in column 3.
--
-- Fix: Cast mc.geo_nombre::text in the SELECT to satisfy the RETURNS TABLE contract.

CREATE OR REPLACE FUNCTION public.get_member_counts(p_nivel text DEFAULT NULL::text)
 RETURNS TABLE(
    nivel text,
    geo_id uuid,
    geo_nombre text,
    provincia_id uuid,
    municipio_id uuid,
    circunscripcion_id uuid,
    sector_id uuid,
    total_miembros bigint,
    coordinadores bigint,
    multiplicadores bigint,
    relacionados bigint
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tenant_id UUID;
    v_scope_level TEXT;
    v_scope_id UUID;
BEGIN
    v_tenant_id := public.get_my_tenant_id();
    v_scope_level := public.get_my_scope_level();
    v_scope_id := public.get_my_scope_id();

    RETURN QUERY
    SELECT
        mc.nivel,
        mc.geo_id,
        mc.geo_nombre::text,  -- Cast varchar(100) -> text to match RETURNS TABLE
        mc.provincia_id,
        mc.municipio_id,
        mc.circunscripcion_id,
        mc.sector_id,
        mc.total_miembros,
        mc.coordinadores,
        mc.multiplicadores,
        mc.relacionados
    FROM mv_member_counts mc
    WHERE mc.tenant_id = v_tenant_id
      AND (p_nivel IS NULL OR mc.nivel = p_nivel)
      AND (
          -- Admin: no geographic scope restriction
          v_scope_level IS NULL
          -- Provincia scope: show all data within that provincia
          OR (v_scope_level = 'provincia' AND mc.provincia_id = v_scope_id)
          -- Municipio scope: show only data within that municipio
          OR (v_scope_level = 'municipio' AND mc.municipio_id = v_scope_id)
          -- Circunscripcion scope: show only data within that circunscripcion
          OR (v_scope_level = 'circunscripcion' AND mc.circunscripcion_id = v_scope_id)
      );
END;
$function$;

-- Down migration (rollback):
-- To revert, restore the original function WITHOUT the ::text cast.
-- However, this would re-introduce the type mismatch error.
-- The correct rollback would be to ALTER the mv_member_counts.geo_nombre
-- column to TEXT instead, but that is a more invasive change.
-- ROLLBACK: DROP FUNCTION IF EXISTS public.get_member_counts(text);
