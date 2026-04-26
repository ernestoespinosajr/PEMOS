-- =============================================================================
-- Migration: Seguimiento RLS Remediation (ftr-009 Quality Review)
-- =============================================================================
-- Addresses issues #1, #2, #4, #5 from Quinn's quality review of ftr-009:
--
--   Issue #1 (Critical): All 4 new tables lack tenant isolation in RLS policies.
--     Fix: Drop and recreate all RLS policies on padron_externo,
--     seguimiento_no_inscritos, seguimiento_no_inscritos_historial, and
--     plantillas_llamada to include partido_id tenant scoping via a new helper
--     function partido_belongs_to_my_tenant().
--
--   Issue #2 (Medium): padron_externo SELECT gives field workers access to ALL
--     voter PII across all recintos.
--     Fix: Field workers restricted to recintos they are assigned to via
--     asignacion_recintos subquery.
--
--   Issue #3 (Medium): Conversion workflow not atomic.
--     Fix: New convert_seguimiento_to_member() RPC function wraps member
--     creation + seguimiento update in a single transaction.
--
--   Issue #4 (Medium): Missing composite index for get_conversion_rates().
--     Fix: Add idx_seguimiento_partido_created composite index.
--
--   Issue #5 (Medium): Admin policies on padron_externo lack partido_id scoping.
--     Fix: Addressed as part of Issue #1 -- all policies now scope by partido_id.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.convert_seguimiento_to_member(UUID, JSONB);
--   DROP FUNCTION IF EXISTS public.partido_belongs_to_my_tenant(UUID);
--   DROP INDEX IF EXISTS idx_seguimiento_partido_created;
--   -- Then restore original policies from 20260409000010
-- =============================================================================


-- =============================================================================
-- STEP 1: Helper function for tenant-scoped partido_id checks
-- =============================================================================
-- The seguimiento tables use partido_id (FK to partidos) rather than a direct
-- tenant_id column. This helper verifies that a given partido_id belongs to the
-- current user's tenant by joining through the partidos table.

CREATE OR REPLACE FUNCTION public.partido_belongs_to_my_tenant(p_partido_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM partidos p
        WHERE p.id = p_partido_id
          AND p.tenant_id = public.get_my_tenant_id()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.partido_belongs_to_my_tenant(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.partido_belongs_to_my_tenant(UUID) FROM anon, PUBLIC;


-- =============================================================================
-- STEP 2: Drop all existing RLS policies on the 4 seguimiento tables
-- =============================================================================

-- padron_externo
DROP POLICY IF EXISTS "padron_externo_select" ON padron_externo;
DROP POLICY IF EXISTS "padron_externo_insert_admin" ON padron_externo;
DROP POLICY IF EXISTS "padron_externo_update_admin" ON padron_externo;
DROP POLICY IF EXISTS "padron_externo_delete_admin" ON padron_externo;

-- seguimiento_no_inscritos
DROP POLICY IF EXISTS "seguimiento_no_inscritos_select" ON seguimiento_no_inscritos;
DROP POLICY IF EXISTS "seguimiento_no_inscritos_insert" ON seguimiento_no_inscritos;
DROP POLICY IF EXISTS "seguimiento_no_inscritos_update" ON seguimiento_no_inscritos;
DROP POLICY IF EXISTS "seguimiento_no_inscritos_delete_admin" ON seguimiento_no_inscritos;

-- seguimiento_no_inscritos_historial
DROP POLICY IF EXISTS "seguimiento_historial_select" ON seguimiento_no_inscritos_historial;
DROP POLICY IF EXISTS "seguimiento_historial_insert" ON seguimiento_no_inscritos_historial;

-- plantillas_llamada
DROP POLICY IF EXISTS "plantillas_llamada_select" ON plantillas_llamada;
DROP POLICY IF EXISTS "plantillas_llamada_insert_admin" ON plantillas_llamada;
DROP POLICY IF EXISTS "plantillas_llamada_update_admin" ON plantillas_llamada;
DROP POLICY IF EXISTS "plantillas_llamada_delete_admin" ON plantillas_llamada;


-- =============================================================================
-- STEP 3: Recreate padron_externo policies with tenant isolation
-- =============================================================================
-- Issue #1: Add partido_id tenant scoping to all policies.
-- Issue #2: Field workers restricted to assigned recintos for SELECT.
-- Issue #5: Admin INSERT/UPDATE/DELETE include partido_id scoping.

CREATE POLICY "padron_externo_select"
    ON padron_externo FOR SELECT
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND (
            -- Admin and coordinator: see all within tenant
            public.get_my_role() IN ('admin', 'coordinator')
            OR (
                -- Field worker: restricted to assigned recintos
                public.get_my_role() = 'field_worker'
                AND cod_recinto IN (
                    SELECT r.cod_recinto
                    FROM asignacion_recintos ar
                    JOIN recintos r ON r.id = ar.recinto_id
                    WHERE ar.usuario_id = auth.uid()
                      AND ar.estado = true
                )
            )
        )
    );

CREATE POLICY "padron_externo_insert_admin"
    ON padron_externo FOR INSERT
    TO authenticated
    WITH CHECK (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "padron_externo_update_admin"
    ON padron_externo FOR UPDATE
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "padron_externo_delete_admin"
    ON padron_externo FOR DELETE
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- STEP 4: Recreate seguimiento_no_inscritos policies with tenant isolation
-- =============================================================================

CREATE POLICY "seguimiento_no_inscritos_select"
    ON seguimiento_no_inscritos FOR SELECT
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND (
            public.get_my_role() IN ('admin', 'coordinator')
            OR usuario_id = auth.uid()
        )
    );

CREATE POLICY "seguimiento_no_inscritos_insert"
    ON seguimiento_no_inscritos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND usuario_id = auth.uid()
    );

CREATE POLICY "seguimiento_no_inscritos_update"
    ON seguimiento_no_inscritos FOR UPDATE
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND (
            public.get_my_role() IN ('admin', 'coordinator')
            OR usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND (
            public.get_my_role() IN ('admin', 'coordinator')
            OR usuario_id = auth.uid()
        )
    );

CREATE POLICY "seguimiento_no_inscritos_delete_admin"
    ON seguimiento_no_inscritos FOR DELETE
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- STEP 5: Recreate seguimiento_no_inscritos_historial policies
-- =============================================================================
-- This table has no direct partido_id column. Tenant isolation is enforced
-- by joining through seguimiento_no_inscritos via seguimiento_id.

CREATE POLICY "seguimiento_historial_select"
    ON seguimiento_no_inscritos_historial FOR SELECT
    TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND seguimiento_id IN (
            SELECT s.id
            FROM seguimiento_no_inscritos s
            WHERE public.partido_belongs_to_my_tenant(s.partido_id)
        )
    );

-- INSERT allowed for the trigger function (runs as SECURITY DEFINER)
-- and for direct inserts by authenticated users.
-- Tenant check via seguimiento_id join.
CREATE POLICY "seguimiento_historial_insert"
    ON seguimiento_no_inscritos_historial FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND seguimiento_id IN (
            SELECT s.id
            FROM seguimiento_no_inscritos s
            WHERE public.partido_belongs_to_my_tenant(s.partido_id)
        )
    );

-- No UPDATE or DELETE policies: history is immutable


-- =============================================================================
-- STEP 6: Recreate plantillas_llamada policies with tenant isolation
-- =============================================================================

CREATE POLICY "plantillas_llamada_select"
    ON plantillas_llamada FOR SELECT
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    );

CREATE POLICY "plantillas_llamada_insert_admin"
    ON plantillas_llamada FOR INSERT
    TO authenticated
    WITH CHECK (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "plantillas_llamada_update_admin"
    ON plantillas_llamada FOR UPDATE
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    );

CREATE POLICY "plantillas_llamada_delete_admin"
    ON plantillas_llamada FOR DELETE
    TO authenticated
    USING (
        public.partido_belongs_to_my_tenant(partido_id)
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- STEP 7: Composite index for get_conversion_rates() (Issue #4)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_seguimiento_partido_created
    ON seguimiento_no_inscritos(partido_id, created_at);


-- =============================================================================
-- STEP 8: Atomic conversion function (Issue #3)
-- =============================================================================
-- Wraps member creation + seguimiento update in a single transaction.
-- Called via supabase.rpc('convert_seguimiento_to_member', {...}).
-- Returns the new member UUID on success, raises exception on failure.

CREATE OR REPLACE FUNCTION public.convert_seguimiento_to_member(
    p_seguimiento_id UUID,
    p_member_data JSONB
)
RETURNS UUID AS $$
DECLARE
    v_seguimiento RECORD;
    v_padron RECORD;
    v_new_member_id UUID;
    v_cedula VARCHAR;
    v_partido_id UUID;
    v_existing_id UUID;
BEGIN
    -- 1. Fetch and lock the seguimiento record
    SELECT * INTO v_seguimiento
    FROM seguimiento_no_inscritos
    WHERE id = p_seguimiento_id
    FOR UPDATE;

    IF v_seguimiento IS NULL THEN
        RAISE EXCEPTION 'Registro de seguimiento no encontrado'
            USING ERRCODE = 'P0002'; -- no_data_found
    END IF;

    IF v_seguimiento.miembro_id IS NOT NULL THEN
        RAISE EXCEPTION 'Este registro ya fue convertido a miembro'
            USING ERRCODE = 'P0001'; -- raise_exception
    END IF;

    v_cedula := v_seguimiento.cedula;
    v_partido_id := v_seguimiento.partido_id;

    -- 2. Check for duplicate cedula in miembros
    SELECT id INTO v_existing_id
    FROM miembros
    WHERE cedula = v_cedula
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'Ya existe un miembro con la cedula %', v_cedula
            USING ERRCODE = '23505'; -- unique_violation
    END IF;

    -- 3. Fetch padron data for pre-population
    SELECT * INTO v_padron
    FROM padron_externo
    WHERE cedula = v_cedula
      AND partido_id = v_partido_id
    LIMIT 1;

    -- 4. Insert the new member
    INSERT INTO miembros (
        cedula,
        nombre,
        apellido,
        tipo_miembro,
        telefono,
        celular,
        direccion,
        sexo,
        recinto_id,
        colegio,
        sector_id,
        comite_id,
        nivel_intermedio_id,
        coordinador_id,
        email,
        tenant_id
    ) VALUES (
        v_cedula,
        COALESCE(p_member_data->>'nombre', v_padron.nombres, 'Sin nombre'),
        COALESCE(p_member_data->>'apellido', v_padron.apellidos, 'Sin apellido'),
        (COALESCE(p_member_data->>'tipo_miembro', 'relacionado'))::tipo_miembro,
        COALESCE(p_member_data->>'telefono', v_padron.telefonos),
        COALESCE(p_member_data->>'celular', v_padron.telefonos_alt),
        COALESCE(p_member_data->>'direccion', v_padron.direccion_residencia),
        COALESCE(p_member_data->>'sexo', v_padron.sexo),
        COALESCE((p_member_data->>'recinto_id')::UUID, v_seguimiento.recinto_id),
        COALESCE(p_member_data->>'colegio', v_seguimiento.colegio, v_padron.colegio),
        (p_member_data->>'sector_id')::UUID,
        (p_member_data->>'comite_id')::UUID,
        (p_member_data->>'nivel_intermedio_id')::UUID,
        (p_member_data->>'coordinador_id')::UUID,
        p_member_data->>'email',
        (p_member_data->>'tenant_id')::UUID
    )
    RETURNING id INTO v_new_member_id;

    -- 5. Update the seguimiento record atomically
    UPDATE seguimiento_no_inscritos
    SET estado = 'registrado',
        fecha_conversion = now(),
        miembro_id = v_new_member_id
    WHERE id = p_seguimiento_id;

    RETURN v_new_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.convert_seguimiento_to_member(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.convert_seguimiento_to_member(UUID, JSONB) FROM anon, PUBLIC;
