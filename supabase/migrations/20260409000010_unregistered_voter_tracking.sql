-- =============================================================================
-- Migration: Unregistered Voter Tracking (ftr-009)
-- =============================================================================
-- Implements the full schema for tracking potential voters not yet registered
-- in the JCE electoral roll, managing follow-up workflows, and measuring
-- conversion rates.
--
-- Changes:
--   DROP & RECREATE: seguimiento_no_inscritos (fundamentally different schema)
--   NEW TABLES:
--     - padron_externo (external JCE voter roll data)
--     - seguimiento_no_inscritos_historial (follow-up history, append-only)
--     - plantillas_llamada (configurable call script templates)
--   NEW FUNCTIONS:
--     - get_followup_queue(): returns filtered queue of individuals to follow up
--     - get_conversion_rates(): returns conversion metrics by geographic area
--     - trg_fn_seguimiento_historial(): auto-creates history entries on update
--   RLS POLICIES:
--     - All 4 tables get tenant-scoped RLS policies
--     - Field workers restricted to assigned recintos
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_followup_queue(UUID, INTEGER, INTEGER);
--   DROP FUNCTION IF EXISTS public.get_conversion_rates(TEXT, UUID, DATE, DATE, UUID);
--   DROP FUNCTION IF EXISTS public.trg_fn_seguimiento_historial() CASCADE;
--   DROP TABLE IF EXISTS plantillas_llamada;
--   DROP TABLE IF EXISTS seguimiento_no_inscritos_historial;
--   DROP TABLE IF EXISTS seguimiento_no_inscritos;
--   DROP TABLE IF EXISTS padron_externo;
--   -- Then restore the original seguimiento_no_inscritos from 20260408234050
-- =============================================================================


-- =============================================================================
-- STEP 1: Drop existing seguimiento_no_inscritos
-- =============================================================================
-- The existing table from 20260408234050 has a simplified schema that does not
-- match ftr-009 requirements. Pre-production, no live data -- drop and recreate.

-- Drop existing RLS policies (from 20260409000002)
DROP POLICY IF EXISTS "seguimiento_no_inscritos_select" ON seguimiento_no_inscritos;
DROP POLICY IF EXISTS "seguimiento_no_inscritos_insert" ON seguimiento_no_inscritos;
DROP POLICY IF EXISTS "seguimiento_no_inscritos_update" ON seguimiento_no_inscritos;
DROP POLICY IF EXISTS "seguimiento_no_inscritos_delete_admin" ON seguimiento_no_inscritos;

-- Drop existing indexes (from 20260408234052)
DROP INDEX IF EXISTS idx_seguimiento_sector_id;
DROP INDEX IF EXISTS idx_seguimiento_responsable_id;
DROP INDEX IF EXISTS idx_seguimiento_estado_seguimiento;
DROP INDEX IF EXISTS idx_seguimiento_tenant_id;

-- Drop trigger and table
DROP TRIGGER IF EXISTS trg_seguimiento_no_inscritos_updated_at ON seguimiento_no_inscritos;
DROP TABLE seguimiento_no_inscritos;


-- =============================================================================
-- STEP 2: Create padron_externo table
-- =============================================================================
-- Stores external JCE voter roll data. Initially loaded from CSV/SQL;
-- future JCE API integration in Phase 3.

CREATE TABLE padron_externo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cedula VARCHAR(20) NOT NULL,
    nombres VARCHAR(255),
    apellidos VARCHAR(255),
    sexo VARCHAR(1),
    edad INTEGER,
    colegio VARCHAR(100),
    cod_recinto VARCHAR(20),
    nombre_recinto VARCHAR(255),
    direccion_recinto TEXT,
    cod_comite_intermedio VARCHAR(50),
    comite_intermedio VARCHAR(255),
    comite_de_base VARCHAR(255),
    telefonos VARCHAR(50),
    telefonos_alt VARCHAR(50),
    direccion_residencia TEXT,
    sector_residencia VARCHAR(255),
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_padron_externo_cedula_partido UNIQUE (cedula, partido_id)
);

CREATE INDEX idx_padron_externo_cedula ON padron_externo(cedula);
CREATE INDEX idx_padron_externo_cod_recinto ON padron_externo(cod_recinto);
CREATE INDEX idx_padron_externo_partido_id ON padron_externo(partido_id);


-- =============================================================================
-- STEP 3: Recreate seguimiento_no_inscritos with ftr-009 target schema
-- =============================================================================

CREATE TABLE seguimiento_no_inscritos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cedula VARCHAR(20) NOT NULL,
    colegio VARCHAR(100),
    recinto_id UUID REFERENCES recintos(id) ON DELETE RESTRICT,
    cod_recinto VARCHAR(20),

    -- Follow-up outcome
    contacto VARCHAR(2) CHECK (contacto IN ('SI', 'NO')),
    decision_voto VARCHAR(50),
    decision_presidente VARCHAR(50),
    comentario TEXT,

    -- Status tracking (state machine)
    estado VARCHAR(30) NOT NULL DEFAULT 'no_contactado'
        CHECK (estado IN (
            'no_contactado',
            'contactado',
            'seguimiento_programado',
            'registrado',
            'rechazado'
        )),
    fecha_proximo_seguimiento DATE,

    -- Conversion tracking
    fecha_conversion TIMESTAMPTZ,
    miembro_id UUID REFERENCES miembros(id) ON DELETE SET NULL,

    -- Audit
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    terminal VARCHAR(100),
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_seguimiento_no_inscritos_updated_at
    BEFORE UPDATE ON seguimiento_no_inscritos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_seguimiento_cedula ON seguimiento_no_inscritos(cedula);
CREATE INDEX idx_seguimiento_recinto_id ON seguimiento_no_inscritos(recinto_id);
CREATE INDEX idx_seguimiento_estado ON seguimiento_no_inscritos(estado);
CREATE INDEX idx_seguimiento_proximo ON seguimiento_no_inscritos(fecha_proximo_seguimiento);
CREATE INDEX idx_seguimiento_partido_id ON seguimiento_no_inscritos(partido_id);
CREATE INDEX idx_seguimiento_usuario_id ON seguimiento_no_inscritos(usuario_id);


-- =============================================================================
-- STEP 4: Create seguimiento_no_inscritos_historial table
-- =============================================================================
-- Append-only table recording each follow-up contact attempt.
-- Populated automatically by trigger on seguimiento_no_inscritos updates.

CREATE TABLE seguimiento_no_inscritos_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seguimiento_id UUID NOT NULL REFERENCES seguimiento_no_inscritos(id) ON DELETE CASCADE,
    contacto VARCHAR(2) CHECK (contacto IN ('SI', 'NO')),
    decision_voto VARCHAR(50),
    decision_presidente VARCHAR(50),
    comentario TEXT,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_historial_seguimiento_id ON seguimiento_no_inscritos_historial(seguimiento_id);
CREATE INDEX idx_historial_created_at ON seguimiento_no_inscritos_historial(created_at);


-- =============================================================================
-- STEP 5: Create plantillas_llamada table
-- =============================================================================
-- Configurable call script templates for field workers.
-- Template content supports placeholders: {nombre}, {apellido}, {telefono},
-- {recinto}, {colegio}, {direccion}, {multiplicador}

CREATE TABLE plantillas_llamada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_plantillas_llamada_updated_at
    BEFORE UPDATE ON plantillas_llamada
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_plantillas_llamada_partido_id ON plantillas_llamada(partido_id);
CREATE INDEX idx_plantillas_llamada_activa ON plantillas_llamada(activa);


-- =============================================================================
-- STEP 6: Create auto-history trigger
-- =============================================================================
-- Automatically inserts a history record whenever seguimiento_no_inscritos
-- is updated. Captures the state transition and the user who made the change.

CREATE OR REPLACE FUNCTION public.trg_fn_seguimiento_historial()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO seguimiento_no_inscritos_historial (
        seguimiento_id,
        contacto,
        decision_voto,
        decision_presidente,
        comentario,
        estado_anterior,
        estado_nuevo,
        usuario_id
    ) VALUES (
        NEW.id,
        NEW.contacto,
        NEW.decision_voto,
        NEW.decision_presidente,
        NEW.comentario,
        OLD.estado,
        NEW.estado,
        COALESCE(auth.uid(), NEW.usuario_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_seguimiento_historial
    AFTER UPDATE ON seguimiento_no_inscritos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_seguimiento_historial();


-- =============================================================================
-- STEP 7: Create get_followup_queue() RPC function
-- =============================================================================
-- Returns a filtered queue of unregistered individuals for a given field worker.
-- Replicates legacy ceduladoPorRecintoColegio() pattern:
--   1. Joins padron_externo with user's recinto assignments
--   2. LEFT JOINs on seguimiento_no_inscritos to include in-progress items
--   3. Excludes terminal states (registrado, rechazado)
--   4. Excludes entries without phone numbers
--   5. Orders by overdue first, then scheduled date, then new items

CREATE OR REPLACE FUNCTION public.get_followup_queue(
    p_usuario_id UUID,
    p_limit INTEGER DEFAULT 25,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    padron_id UUID,
    cedula VARCHAR,
    nombres VARCHAR,
    apellidos VARCHAR,
    telefonos VARCHAR,
    colegio VARCHAR,
    cod_recinto VARCHAR,
    nombre_recinto VARCHAR,
    direccion_recinto TEXT,
    seguimiento_id UUID,
    estado VARCHAR,
    contacto VARCHAR,
    decision_voto VARCHAR,
    decision_presidente VARCHAR,
    comentario TEXT,
    fecha_proximo_seguimiento DATE,
    recinto_id UUID,
    es_vencido BOOLEAN,
    total_count BIGINT
) AS $$
DECLARE
    v_partido_id UUID;
BEGIN
    -- Get the active partido_id from the active electoral period
    SELECT pe.partido_id INTO v_partido_id
    FROM periodos_electorales pe
    WHERE pe.activo = true AND pe.estado = true
    LIMIT 1;

    IF v_partido_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH user_recintos AS (
        -- Get recintos assigned to this user
        SELECT DISTINCT ar.recinto_id, r.cod_recinto AS assigned_cod_recinto
        FROM asignacion_recintos ar
        JOIN recintos r ON r.id = ar.recinto_id
        WHERE ar.usuario_id = p_usuario_id
          AND ar.estado = true
    ),
    queue AS (
        SELECT
            pe.id AS padron_id,
            pe.cedula,
            pe.nombres,
            pe.apellidos,
            pe.telefonos,
            pe.colegio,
            pe.cod_recinto,
            pe.nombre_recinto,
            pe.direccion_recinto,
            s.id AS seguimiento_id,
            COALESCE(s.estado, 'no_contactado')::VARCHAR AS estado,
            s.contacto,
            s.decision_voto,
            s.decision_presidente,
            s.comentario,
            s.fecha_proximo_seguimiento,
            ur.recinto_id,
            CASE
                WHEN s.fecha_proximo_seguimiento IS NOT NULL
                     AND s.fecha_proximo_seguimiento < CURRENT_DATE
                THEN true
                ELSE false
            END AS es_vencido
        FROM padron_externo pe
        INNER JOIN user_recintos ur ON pe.cod_recinto = ur.assigned_cod_recinto
        LEFT JOIN seguimiento_no_inscritos s
            ON s.cedula = pe.cedula
            AND s.partido_id = v_partido_id
        WHERE pe.partido_id = v_partido_id
          -- Exclude entries without valid phone numbers
          AND pe.telefonos IS NOT NULL
          AND pe.telefonos NOT IN ('0', '', ' ')
          -- Exclude terminal states
          AND COALESCE(s.estado, 'no_contactado') NOT IN ('registrado', 'rechazado')
    )
    SELECT
        q.padron_id,
        q.cedula,
        q.nombres,
        q.apellidos,
        q.telefonos,
        q.colegio,
        q.cod_recinto,
        q.nombre_recinto,
        q.direccion_recinto,
        q.seguimiento_id,
        q.estado,
        q.contacto,
        q.decision_voto,
        q.decision_presidente,
        q.comentario,
        q.fecha_proximo_seguimiento,
        q.recinto_id,
        q.es_vencido,
        COUNT(*) OVER() AS total_count
    FROM queue q
    ORDER BY
        q.es_vencido DESC,                       -- Overdue first
        q.fecha_proximo_seguimiento ASC NULLS LAST, -- Scheduled next
        q.estado = 'no_contactado' DESC,          -- New items
        q.nombres ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 8: Create get_conversion_rates() RPC function
-- =============================================================================
-- Returns conversion funnel metrics filtered by geographic area and date range.

CREATE OR REPLACE FUNCTION public.get_conversion_rates(
    p_area_type TEXT DEFAULT NULL,
    p_area_id UUID DEFAULT NULL,
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin DATE DEFAULT NULL,
    p_partido_id UUID DEFAULT NULL
)
RETURNS TABLE (
    area_id UUID,
    area_nombre VARCHAR,
    total BIGINT,
    contactados BIGINT,
    registrados BIGINT,
    rechazados BIGINT,
    pendientes BIGINT,
    tasa_conversion NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE p_area_type
            WHEN 'municipio' THEN mu.id
            WHEN 'circunscripcion' THEN ci.id
            WHEN 'recinto' THEN r.id
            WHEN 'provincia' THEN pr.id
            ELSE NULL::UUID
        END AS area_id,
        CASE p_area_type
            WHEN 'municipio' THEN mu.nombre
            WHEN 'circunscripcion' THEN ci.nombre
            WHEN 'recinto' THEN r.nombre
            WHEN 'provincia' THEN pr.nombre
            ELSE 'Total'::VARCHAR
        END AS area_nombre,
        COUNT(*)::BIGINT AS total,
        COUNT(*) FILTER (WHERE s.estado IN ('contactado', 'seguimiento_programado', 'registrado', 'rechazado'))::BIGINT AS contactados,
        COUNT(*) FILTER (WHERE s.estado = 'registrado')::BIGINT AS registrados,
        COUNT(*) FILTER (WHERE s.estado = 'rechazado')::BIGINT AS rechazados,
        COUNT(*) FILTER (WHERE s.estado IN ('no_contactado', 'contactado', 'seguimiento_programado'))::BIGINT AS pendientes,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(
                (COUNT(*) FILTER (WHERE s.estado = 'registrado')::NUMERIC / COUNT(*)::NUMERIC) * 100,
                1
            )
            ELSE 0
        END AS tasa_conversion
    FROM seguimiento_no_inscritos s
    LEFT JOIN recintos r ON r.id = s.recinto_id
    LEFT JOIN municipios mu ON mu.id = r.municipio_id
    LEFT JOIN circunscripciones ci ON ci.id = r.circunscripcion_id
    LEFT JOIN provincias pr ON pr.id = mu.provincia_id
    WHERE
        -- Partido filter
        (p_partido_id IS NULL OR s.partido_id = p_partido_id)
        -- Date range filter
        AND (p_fecha_inicio IS NULL OR s.created_at >= p_fecha_inicio::TIMESTAMPTZ)
        AND (p_fecha_fin IS NULL OR s.created_at < (p_fecha_fin + INTERVAL '1 day')::TIMESTAMPTZ)
        -- Area filter
        AND (
            p_area_id IS NULL
            OR (p_area_type = 'municipio' AND mu.id = p_area_id)
            OR (p_area_type = 'circunscripcion' AND ci.id = p_area_id)
            OR (p_area_type = 'recinto' AND r.id = p_area_id)
            OR (p_area_type = 'provincia' AND pr.id = p_area_id)
        )
    GROUP BY
        CASE p_area_type
            WHEN 'municipio' THEN mu.id
            WHEN 'circunscripcion' THEN ci.id
            WHEN 'recinto' THEN r.id
            WHEN 'provincia' THEN pr.id
            ELSE NULL::UUID
        END,
        CASE p_area_type
            WHEN 'municipio' THEN mu.nombre
            WHEN 'circunscripcion' THEN ci.nombre
            WHEN 'recinto' THEN r.nombre
            WHEN 'provincia' THEN pr.nombre
            ELSE 'Total'::VARCHAR
        END
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;


-- =============================================================================
-- STEP 9: Enable RLS and create policies
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE padron_externo ENABLE ROW LEVEL SECURITY;
ALTER TABLE padron_externo FORCE ROW LEVEL SECURITY;

ALTER TABLE seguimiento_no_inscritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_no_inscritos FORCE ROW LEVEL SECURITY;

ALTER TABLE seguimiento_no_inscritos_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_no_inscritos_historial FORCE ROW LEVEL SECURITY;

ALTER TABLE plantillas_llamada ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_llamada FORCE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- padron_externo policies
-- ---------------------------------------------------------------------------

CREATE POLICY "padron_externo_select"
    ON padron_externo FOR SELECT
    TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    );

CREATE POLICY "padron_externo_insert_admin"
    ON padron_externo FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() = 'admin'
    );

CREATE POLICY "padron_externo_update_admin"
    ON padron_externo FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "padron_externo_delete_admin"
    ON padron_externo FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');


-- ---------------------------------------------------------------------------
-- seguimiento_no_inscritos policies
-- ---------------------------------------------------------------------------

CREATE POLICY "seguimiento_no_inscritos_select"
    ON seguimiento_no_inscritos FOR SELECT
    TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND (
            public.get_my_role() IN ('admin', 'coordinator')
            OR usuario_id = auth.uid()
        )
    );

CREATE POLICY "seguimiento_no_inscritos_insert"
    ON seguimiento_no_inscritos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND usuario_id = auth.uid()
    );

CREATE POLICY "seguimiento_no_inscritos_update"
    ON seguimiento_no_inscritos FOR UPDATE
    TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND (
            public.get_my_role() IN ('admin', 'coordinator')
            OR usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
        AND (
            public.get_my_role() IN ('admin', 'coordinator')
            OR usuario_id = auth.uid()
        )
    );

CREATE POLICY "seguimiento_no_inscritos_delete_admin"
    ON seguimiento_no_inscritos FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');


-- ---------------------------------------------------------------------------
-- seguimiento_no_inscritos_historial policies
-- ---------------------------------------------------------------------------

CREATE POLICY "seguimiento_historial_select"
    ON seguimiento_no_inscritos_historial FOR SELECT
    TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    );

-- INSERT allowed for the trigger function (runs as SECURITY DEFINER)
-- and for direct inserts by authenticated users
CREATE POLICY "seguimiento_historial_insert"
    ON seguimiento_no_inscritos_historial FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    );

-- No UPDATE or DELETE policies: history is immutable


-- ---------------------------------------------------------------------------
-- plantillas_llamada policies
-- ---------------------------------------------------------------------------

CREATE POLICY "plantillas_llamada_select"
    ON plantillas_llamada FOR SELECT
    TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    );

CREATE POLICY "plantillas_llamada_insert_admin"
    ON plantillas_llamada FOR INSERT
    TO authenticated
    WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "plantillas_llamada_update_admin"
    ON plantillas_llamada FOR UPDATE
    TO authenticated
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "plantillas_llamada_delete_admin"
    ON plantillas_llamada FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');


-- =============================================================================
-- STEP 10: Grant permissions
-- =============================================================================

-- Revoke from anon
REVOKE ALL ON padron_externo FROM anon;
REVOKE ALL ON seguimiento_no_inscritos FROM anon;
REVOKE ALL ON seguimiento_no_inscritos_historial FROM anon;
REVOKE ALL ON plantillas_llamada FROM anon;

-- Grant to authenticated (RLS controls actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON padron_externo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON seguimiento_no_inscritos TO authenticated;
GRANT SELECT, INSERT ON seguimiento_no_inscritos_historial TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON plantillas_llamada TO authenticated;

-- Grant execute on new RPC functions
GRANT EXECUTE ON FUNCTION public.get_followup_queue(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversion_rates(TEXT, UUID, DATE, DATE, UUID) TO authenticated;

-- Revoke from anon/PUBLIC (security pattern)
REVOKE EXECUTE ON FUNCTION public.get_followup_queue(UUID, INTEGER, INTEGER) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_conversion_rates(TEXT, UUID, DATE, DATE, UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_fn_seguimiento_historial() FROM anon, PUBLIC;
