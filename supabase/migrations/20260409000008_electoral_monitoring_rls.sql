-- =============================================================================
-- Migration: RLS Policies for Electoral Monitoring Tables (ftr-006 Phase 1)
-- =============================================================================
-- Implements Row-Level Security for all new and restructured electoral tables:
--
--   - periodos_electorales: admin CRUD, coordinator/observer SELECT
--   - colegios: admin CRUD, coordinator/observer SELECT
--   - candidato_votos (new): observer/coordinator INSERT/UPDATE on assigned
--     recintos, admin full CRUD
--   - partido_votos: admin/coordinator INSERT/UPDATE, all auth SELECT
--   - actas: append-only (INSERT only, no UPDATE policy), admin DELETE
--   - asignacion_recintos (new): admin CRUD, users SELECT own assignments
--
-- Helper function:
--   - is_assigned_to_recinto(recinto_id, periodo_id): checks if the current
--     auth.users user is assigned to the given recinto for the given period
--
-- Rollback:
--   -- Drop all policies created in this migration
--   DROP POLICY IF EXISTS "periodos_electorales_select" ON periodos_electorales;
--   DROP POLICY IF EXISTS "periodos_electorales_insert_admin" ON periodos_electorales;
--   DROP POLICY IF EXISTS "periodos_electorales_update_admin" ON periodos_electorales;
--   DROP POLICY IF EXISTS "periodos_electorales_delete_admin" ON periodos_electorales;
--   DROP POLICY IF EXISTS "colegios_select" ON colegios;
--   DROP POLICY IF EXISTS "colegios_insert_admin" ON colegios;
--   DROP POLICY IF EXISTS "colegios_update_admin" ON colegios;
--   DROP POLICY IF EXISTS "colegios_delete_admin" ON colegios;
--   DROP POLICY IF EXISTS "candidato_votos_select" ON candidato_votos;
--   DROP POLICY IF EXISTS "candidato_votos_insert" ON candidato_votos;
--   DROP POLICY IF EXISTS "candidato_votos_update" ON candidato_votos;
--   DROP POLICY IF EXISTS "candidato_votos_delete_admin" ON candidato_votos;
--   DROP POLICY IF EXISTS "partido_votos_select" ON partido_votos;
--   DROP POLICY IF EXISTS "partido_votos_insert" ON partido_votos;
--   DROP POLICY IF EXISTS "partido_votos_update" ON partido_votos;
--   DROP POLICY IF EXISTS "partido_votos_delete_admin" ON partido_votos;
--   DROP POLICY IF EXISTS "actas_select" ON actas;
--   DROP POLICY IF EXISTS "actas_insert" ON actas;
--   DROP POLICY IF EXISTS "actas_delete_admin" ON actas;
--   DROP POLICY IF EXISTS "asignacion_recintos_select" ON asignacion_recintos;
--   DROP POLICY IF EXISTS "asignacion_recintos_insert_admin" ON asignacion_recintos;
--   DROP POLICY IF EXISTS "asignacion_recintos_update_admin" ON asignacion_recintos;
--   DROP POLICY IF EXISTS "asignacion_recintos_delete_admin" ON asignacion_recintos;
--   -- Disable RLS on new tables
--   ALTER TABLE periodos_electorales DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE colegios DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE partido_votos DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE actas DISABLE ROW LEVEL SECURITY;
--   -- (candidato_votos and asignacion_recintos RLS was enabled in original migration;
--   --  keep enabled on rollback since original policies would need to be restored)
--   -- Drop helper function
--   DROP FUNCTION IF EXISTS public.is_assigned_to_recinto(UUID, UUID);
--   -- Revoke grants on new tables
--   REVOKE ALL ON periodos_electorales FROM authenticated;
--   REVOKE ALL ON colegios FROM authenticated;
--   REVOKE ALL ON partido_votos FROM authenticated;
--   REVOKE ALL ON actas FROM authenticated;
--   -- (candidato_votos and asignacion_recintos grants from original migration
--   --  would need to be restored)
-- =============================================================================


-- =============================================================================
-- HELPER FUNCTION: is_assigned_to_recinto
-- =============================================================================
-- Checks if the currently authenticated user (auth.uid()) has an active
-- assignment to the given recinto for the given electoral period.
-- Used by candidato_votos and actas RLS policies to restrict observers
-- to their assigned precincts.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_assigned_to_recinto(
    p_recinto_id UUID,
    p_periodo_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM asignacion_recintos ar
        WHERE ar.usuario_id = auth.uid()
          AND ar.recinto_id = p_recinto_id
          AND ar.periodo_id = p_periodo_id
          AND ar.estado = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_assigned_to_recinto(UUID, UUID) TO authenticated;


-- =============================================================================
-- ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- =============================================================================

ALTER TABLE periodos_electorales ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos_electorales FORCE ROW LEVEL SECURITY;

ALTER TABLE colegios ENABLE ROW LEVEL SECURITY;
ALTER TABLE colegios FORCE ROW LEVEL SECURITY;

-- candidato_votos and asignacion_recintos were dropped and recreated,
-- so RLS must be re-enabled
ALTER TABLE candidato_votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidato_votos FORCE ROW LEVEL SECURITY;

ALTER TABLE asignacion_recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_recintos FORCE ROW LEVEL SECURITY;

ALTER TABLE partido_votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE partido_votos FORCE ROW LEVEL SECURITY;

ALTER TABLE actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas FORCE ROW LEVEL SECURITY;


-- =============================================================================
-- PERIODOS_ELECTORALES
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator, Observer: SELECT within tenant
-- =============================================================================

CREATE POLICY "periodos_electorales_select"
    ON periodos_electorales FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
    );

CREATE POLICY "periodos_electorales_insert_admin"
    ON periodos_electorales FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "periodos_electorales_update_admin"
    ON periodos_electorales FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "periodos_electorales_delete_admin"
    ON periodos_electorales FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- COLEGIOS
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator, Observer: SELECT within tenant
-- =============================================================================

CREATE POLICY "colegios_select"
    ON colegios FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
    );

CREATE POLICY "colegios_insert_admin"
    ON colegios FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "colegios_update_admin"
    ON colegios FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "colegios_delete_admin"
    ON colegios FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- CANDIDATO_VOTOS (Recreated)
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator: SELECT + INSERT + UPDATE within geographic scope (via recinto)
-- Observer: SELECT + INSERT + UPDATE restricted to assigned recintos
-- Field Worker: no access
--
-- The key security control: observers and coordinators can only write votes
-- for recintos they are assigned to, verified via is_assigned_to_recinto().
-- =============================================================================

CREATE POLICY "candidato_votos_select"
    ON candidato_votos FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
        AND (
            public.get_my_role() = 'admin'
            OR public.is_within_scope_via_recinto(recinto_id)
            OR public.is_assigned_to_recinto(recinto_id, periodo_id)
        )
    );

CREATE POLICY "candidato_votos_insert"
    ON candidato_votos FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
        AND (
            public.get_my_role() = 'admin'
            OR public.is_assigned_to_recinto(recinto_id, periodo_id)
        )
    );

CREATE POLICY "candidato_votos_update"
    ON candidato_votos FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
        AND (
            public.get_my_role() = 'admin'
            OR public.is_assigned_to_recinto(recinto_id, periodo_id)
        )
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
        AND (
            public.get_my_role() = 'admin'
            OR public.is_assigned_to_recinto(recinto_id, periodo_id)
        )
    );

CREATE POLICY "candidato_votos_delete_admin"
    ON candidato_votos FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- PARTIDO_VOTOS
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator: SELECT + INSERT + UPDATE within tenant
-- Observer: SELECT within tenant
-- Field Worker: no access
-- =============================================================================

CREATE POLICY "partido_votos_select"
    ON partido_votos FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
    );

CREATE POLICY "partido_votos_insert"
    ON partido_votos FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator')
    );

CREATE POLICY "partido_votos_update"
    ON partido_votos FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator')
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator')
    );

CREATE POLICY "partido_votos_delete_admin"
    ON partido_votos FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- ACTAS (Append-Only)
-- =============================================================================
-- Admin: SELECT + INSERT + DELETE (can remove erroneous actas)
-- Coordinator: SELECT + INSERT within tenant
-- Observer: SELECT + INSERT restricted to assigned recintos
-- Field Worker: no access
--
-- CRITICAL: No UPDATE policy exists. Actas are immutable once created.
-- This enforces the append-only audit trail at the database level.
-- =============================================================================

CREATE POLICY "actas_select"
    ON actas FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
        AND (
            public.get_my_role() = 'admin'
            OR public.is_within_scope_via_recinto(recinto_id)
            OR public.is_assigned_to_recinto(recinto_id, periodo_id)
        )
    );

CREATE POLICY "actas_insert"
    ON actas FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
        AND (
            public.get_my_role() = 'admin'
            OR public.is_assigned_to_recinto(recinto_id, periodo_id)
        )
        AND registrado_por = auth.uid()
    );

CREATE POLICY "actas_delete_admin"
    ON actas FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- ASIGNACION_RECINTOS (Recreated)
-- =============================================================================
-- Admin: full CRUD within tenant
-- Others: SELECT own assignments only (matched via auth.uid() = usuario_id)
-- =============================================================================

CREATE POLICY "asignacion_recintos_select"
    ON asignacion_recintos FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND (
            public.get_my_role() = 'admin'
            OR usuario_id = auth.uid()
        )
    );

CREATE POLICY "asignacion_recintos_insert_admin"
    ON asignacion_recintos FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "asignacion_recintos_update_admin"
    ON asignacion_recintos FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "asignacion_recintos_delete_admin"
    ON asignacion_recintos FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
-- Revoke from anon, grant to authenticated (RLS controls actual access)
-- =============================================================================

-- Revoke all from anon on new tables
REVOKE ALL ON periodos_electorales FROM anon;
REVOKE ALL ON colegios FROM anon;
REVOKE ALL ON partido_votos FROM anon;
REVOKE ALL ON actas FROM anon;
-- Recreated tables also need revoke
REVOKE ALL ON candidato_votos FROM anon;
REVOKE ALL ON asignacion_recintos FROM anon;

-- Grant to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON periodos_electorales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON colegios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON candidato_votos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON partido_votos TO authenticated;
GRANT SELECT, INSERT, DELETE ON actas TO authenticated;  -- No UPDATE grant (append-only)
GRANT SELECT, INSERT, UPDATE, DELETE ON asignacion_recintos TO authenticated;

-- Grant on new materialized views (SELECT only for authenticated)
GRANT SELECT ON mv_votos_por_partido_circunscripcion TO authenticated;
GRANT SELECT ON mv_turnout_por_recinto TO authenticated;
-- Recreated views also need grants
GRANT SELECT ON mv_vote_totals_by_partido TO authenticated;
GRANT SELECT ON mv_vote_totals_by_recinto TO authenticated;

-- Revoke materialized views from anon and PUBLIC (security remediation pattern)
REVOKE ALL ON mv_votos_por_partido_circunscripcion FROM anon, PUBLIC;
REVOKE ALL ON mv_turnout_por_recinto FROM anon, PUBLIC;
REVOKE ALL ON mv_vote_totals_by_partido FROM anon, PUBLIC;
REVOKE ALL ON mv_vote_totals_by_recinto FROM anon, PUBLIC;

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.init_vote_records(UUID, UUID, UUID, UUID) TO authenticated;

-- Revoke function execute from anon/PUBLIC (security remediation pattern)
REVOKE EXECUTE ON FUNCTION public.init_vote_records(UUID, UUID, UUID, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_assigned_to_recinto(UUID, UUID) FROM anon, PUBLIC;
