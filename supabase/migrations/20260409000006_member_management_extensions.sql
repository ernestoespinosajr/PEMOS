-- =============================================================================
-- Migration: Member Management Extensions (ftr-005)
-- =============================================================================
-- Adds missing columns to the miembros table, creates the seguimiento_miembros
-- table for member follow-up tracking, the miembros_audit table with trigger
-- for change auditing, and PostgreSQL functions for member search and
-- hierarchy queries (coordinadores, multiplicadores, relacionados).
--
-- Key decisions:
--   - Columns added are all nullable to avoid breaking existing data
--   - seguimiento_miembros is separate from seguimiento_no_inscritos
--     (different domain: member follow-up vs unregistered voter tracking)
--   - miembros_audit captures old/new row as JSONB for maximum flexibility
--   - pg_trgm extension enables fuzzy search on nombre/apellido
--   - search_members function supports full-text search + multi-filter + pagination
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_relacionados(UUID, UUID);
--   DROP FUNCTION IF EXISTS public.get_multiplicadores(UUID, UUID);
--   DROP FUNCTION IF EXISTS public.get_coordinadores(UUID);
--   DROP FUNCTION IF EXISTS public.search_members(TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT, UUID, BOOLEAN, INTEGER, INTEGER);
--   DROP TRIGGER IF EXISTS trg_miembros_audit ON miembros;
--   DROP FUNCTION IF EXISTS public.fn_miembros_audit();
--   DROP INDEX IF EXISTS idx_miembros_audit_miembro_id;
--   DROP INDEX IF EXISTS idx_miembros_audit_created_at;
--   DROP INDEX IF EXISTS idx_miembros_audit_tenant_id;
--   DROP TABLE IF EXISTS miembros_audit;
--   DROP INDEX IF EXISTS idx_seguimiento_miembros_miembro_id;
--   DROP INDEX IF EXISTS idx_seguimiento_miembros_usuario_id;
--   DROP INDEX IF EXISTS idx_seguimiento_miembros_tenant_id;
--   DROP INDEX IF EXISTS idx_seguimiento_miembros_created_at;
--   DROP TRIGGER IF EXISTS trg_seguimiento_miembros_updated_at ON seguimiento_miembros;
--   DROP TABLE IF EXISTS seguimiento_miembros;
--   DROP INDEX IF EXISTS idx_miembros_nombre_trgm;
--   DROP INDEX IF EXISTS idx_miembros_apellido_trgm;
--   DROP INDEX IF EXISTS idx_miembros_cedula_prefix;
--   DROP INDEX IF EXISTS idx_miembros_created_by;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS apodo;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS trabajo;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS direccion_actual;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS sector_actual;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS vinculado;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS telefono_residencia;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS colegio;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS colegio_ubicacion;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS movimiento_id;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS tipo_movimiento;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS created_by;
--   ALTER TABLE miembros DROP COLUMN IF EXISTS votacion;
--   DROP EXTENSION IF EXISTS pg_trgm;
-- =============================================================================


-- =============================================================================
-- STEP 1: Enable pg_trgm extension for fuzzy name search
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- =============================================================================
-- STEP 2: Add missing columns to miembros table
-- =============================================================================
-- All new columns are nullable to preserve compatibility with existing rows.

-- Personal
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS apodo VARCHAR(50);

-- Professional
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS trabajo VARCHAR(200);

-- Current residence (may differ from registered sector)
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS direccion_actual TEXT;
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS sector_actual VARCHAR(200);

-- Affiliation / link flag
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS vinculado BOOLEAN DEFAULT false;

-- Additional phone
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS telefono_residencia VARCHAR(20);

-- Voting college assignment
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS colegio VARCHAR(100);
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS colegio_ubicacion VARCHAR(200);

-- Political movement
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS movimiento_id UUID;
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS tipo_movimiento VARCHAR(100);

-- Audit: who created this member
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS created_by UUID;

-- Electoral participation flag
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS votacion BOOLEAN DEFAULT false;


-- =============================================================================
-- STEP 3: Trigram indexes for fuzzy search on name and cedula prefix search
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_miembros_nombre_trgm
    ON miembros USING GIN (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_miembros_apellido_trgm
    ON miembros USING GIN (apellido gin_trgm_ops);

-- B-tree index on cedula for prefix/exact match (text_pattern_ops)
CREATE INDEX IF NOT EXISTS idx_miembros_cedula_prefix
    ON miembros (cedula text_pattern_ops);

-- Index on created_by for "who registered" queries
CREATE INDEX IF NOT EXISTS idx_miembros_created_by
    ON miembros (created_by);


-- =============================================================================
-- STEP 4: Create seguimiento_miembros (Member Follow-up Tracking)
-- =============================================================================
-- Tracks follow-up interactions with registered members (e.g., outreach,
-- status checks, campaign contacts). Different from seguimiento_no_inscritos,
-- which tracks *unregistered* voters.
-- =============================================================================
CREATE TABLE seguimiento_miembros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Which member this follow-up is about
    miembro_id UUID NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,

    -- Who performed the follow-up
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,

    -- Type of follow-up: llamada, visita, mensaje, reunion, otro
    tipo VARCHAR(50) NOT NULL DEFAULT 'otro',

    -- Notes / description of the follow-up
    notas TEXT NOT NULL,

    -- Result of the follow-up
    resultado VARCHAR(100),

    -- When the follow-up was performed (defaults to now but can be backdated)
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Tenant isolation
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_seguimiento_miembros_updated_at
    BEFORE UPDATE ON seguimiento_miembros
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_seguimiento_miembros_miembro_id ON seguimiento_miembros(miembro_id);
CREATE INDEX idx_seguimiento_miembros_usuario_id ON seguimiento_miembros(usuario_id);
CREATE INDEX idx_seguimiento_miembros_tenant_id ON seguimiento_miembros(tenant_id);
CREATE INDEX idx_seguimiento_miembros_created_at ON seguimiento_miembros(created_at DESC);

-- RLS
ALTER TABLE seguimiento_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_miembros FORCE ROW LEVEL SECURITY;

-- Tenant-isolated read for authenticated users
CREATE POLICY "seguimiento_miembros_select"
    ON seguimiento_miembros
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_my_tenant_id());

-- Insert: authenticated users within their tenant
CREATE POLICY "seguimiento_miembros_insert"
    ON seguimiento_miembros
    FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Update: only admin or the user who created the entry
CREATE POLICY "seguimiento_miembros_update"
    ON seguimiento_miembros
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND (
            public.get_my_role() = 'admin'
            OR usuario_id = (
                SELECT u.id FROM usuarios u
                WHERE u.auth_user_id = auth.uid()
                LIMIT 1
            )
        )
    );

-- Delete: admin only
CREATE POLICY "seguimiento_miembros_delete"
    ON seguimiento_miembros
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );

-- Revoke from anon
REVOKE ALL ON seguimiento_miembros FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON seguimiento_miembros TO authenticated;


-- =============================================================================
-- STEP 5: Create miembros_audit table + trigger
-- =============================================================================
-- Append-only audit log for all changes to miembros rows.
-- Stores old and new row state as JSONB for complete change history.
-- =============================================================================
CREATE TABLE miembros_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    miembro_id UUID NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    changed_by UUID, -- auth.uid() at time of change
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_miembros_audit_miembro_id ON miembros_audit(miembro_id);
CREATE INDEX idx_miembros_audit_created_at ON miembros_audit(created_at DESC);
CREATE INDEX idx_miembros_audit_tenant_id ON miembros_audit(tenant_id);

-- Trigger function
CREATE OR REPLACE FUNCTION public.fn_miembros_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO miembros_audit (miembro_id, action, new_data, changed_by, tenant_id)
        VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid(), NEW.tenant_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO miembros_audit (miembro_id, action, old_data, new_data, changed_by, tenant_id)
        VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NEW.tenant_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO miembros_audit (miembro_id, action, old_data, changed_by, tenant_id)
        VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid(), OLD.tenant_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_miembros_audit
    AFTER INSERT OR UPDATE OR DELETE ON miembros
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_miembros_audit();

-- RLS: admin read-only access to audit log
ALTER TABLE miembros_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros_audit FORCE ROW LEVEL SECURITY;

CREATE POLICY "miembros_audit_admin_select"
    ON miembros_audit
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt()->>'role') = 'admin'
        AND tenant_id = public.get_my_tenant_id()
    );

-- The trigger function runs as SECURITY DEFINER, so it can insert directly.
-- Authenticated users should NOT insert/update/delete audit rows manually.
REVOKE ALL ON miembros_audit FROM anon;
GRANT SELECT ON miembros_audit TO authenticated;


-- =============================================================================
-- STEP 6: search_members function
-- =============================================================================
-- Full-text search with trigram fuzzy matching, plus multi-filter and pagination.
-- Returns a set of rows plus a total count for pagination metadata.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.search_members(
    p_search TEXT DEFAULT NULL,
    p_cedula TEXT DEFAULT NULL,
    p_provincia_id UUID DEFAULT NULL,
    p_municipio_id UUID DEFAULT NULL,
    p_circunscripcion_id UUID DEFAULT NULL,
    p_sector_id UUID DEFAULT NULL,
    p_tipo_miembro TEXT DEFAULT NULL,
    p_coordinador_id UUID DEFAULT NULL,
    p_estado BOOLEAN DEFAULT NULL,
    p_limit INTEGER DEFAULT 25,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    cedula VARCHAR,
    nombre VARCHAR,
    apellido VARCHAR,
    apodo VARCHAR,
    telefono VARCHAR,
    celular VARCHAR,
    email VARCHAR,
    tipo_miembro tipo_miembro,
    coordinador_id UUID,
    coordinador_nombre TEXT,
    sector_id UUID,
    sector_nombre VARCHAR,
    estado BOOLEAN,
    foto_url VARCHAR,
    created_at TIMESTAMPTZ,
    total_count BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Get caller's tenant
    v_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    WITH filtered AS (
        SELECT
            m.id,
            m.cedula,
            m.nombre,
            m.apellido,
            m.apodo,
            m.telefono,
            m.celular,
            m.email,
            m.tipo_miembro,
            m.coordinador_id,
            COALESCE(coord.nombre || ' ' || coord.apellido, NULL) AS coordinador_nombre,
            m.sector_id,
            s.nombre AS sector_nombre,
            m.estado,
            m.foto_url,
            m.created_at
        FROM miembros m
        LEFT JOIN miembros coord ON coord.id = m.coordinador_id
        LEFT JOIN sectores s ON s.id = m.sector_id
        LEFT JOIN circunscripciones c ON c.id = s.circunscripcion_id
        LEFT JOIN municipios mu ON mu.id = c.municipio_id
        WHERE m.tenant_id = v_tenant_id
            -- Name search: trigram similarity
            AND (p_search IS NULL OR (
                m.nombre ILIKE '%' || p_search || '%'
                OR m.apellido ILIKE '%' || p_search || '%'
                OR m.apodo ILIKE '%' || p_search || '%'
                OR (m.nombre || ' ' || m.apellido) ILIKE '%' || p_search || '%'
            ))
            -- Cedula: exact or prefix
            AND (p_cedula IS NULL OR m.cedula LIKE p_cedula || '%')
            -- Geographic filters
            AND (p_sector_id IS NULL OR m.sector_id = p_sector_id)
            AND (p_circunscripcion_id IS NULL OR s.circunscripcion_id = p_circunscripcion_id)
            AND (p_municipio_id IS NULL OR c.municipio_id = p_municipio_id)
            AND (p_provincia_id IS NULL OR mu.provincia_id = p_provincia_id)
            -- Type filter
            AND (p_tipo_miembro IS NULL OR m.tipo_miembro = p_tipo_miembro::tipo_miembro)
            -- Coordinator filter
            AND (p_coordinador_id IS NULL OR m.coordinador_id = p_coordinador_id)
            -- Status filter
            AND (p_estado IS NULL OR m.estado = p_estado)
    )
    SELECT
        f.id,
        f.cedula,
        f.nombre,
        f.apellido,
        f.apodo,
        f.telefono,
        f.celular,
        f.email,
        f.tipo_miembro,
        f.coordinador_id,
        f.coordinador_nombre,
        f.sector_id,
        f.sector_nombre,
        f.estado,
        f.foto_url,
        f.created_at,
        COUNT(*) OVER() AS total_count
    FROM filtered f
    ORDER BY f.apellido, f.nombre
    LIMIT GREATEST(p_limit, 1)
    OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =============================================================================
-- STEP 7: get_coordinadores function
-- =============================================================================
-- Returns all coordinators within the caller's tenant, with a count of
-- multiplicadores assigned to each.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_coordinadores(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    cedula VARCHAR,
    nombre VARCHAR,
    apellido VARCHAR,
    telefono VARCHAR,
    celular VARCHAR,
    email VARCHAR,
    sector_id UUID,
    sector_nombre VARCHAR,
    estado BOOLEAN,
    foto_url VARCHAR,
    multiplicador_count BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, public.get_my_tenant_id());

    RETURN QUERY
    SELECT
        m.id,
        m.cedula,
        m.nombre,
        m.apellido,
        m.telefono,
        m.celular,
        m.email,
        m.sector_id,
        s.nombre AS sector_nombre,
        m.estado,
        m.foto_url,
        COUNT(sub.id) AS multiplicador_count
    FROM miembros m
    LEFT JOIN sectores s ON s.id = m.sector_id
    LEFT JOIN miembros sub ON sub.coordinador_id = m.id AND sub.tipo_miembro = 'multiplicador'
    WHERE m.tenant_id = v_tenant_id
        AND m.tipo_miembro = 'coordinador'
        AND m.estado = true
    GROUP BY m.id, m.cedula, m.nombre, m.apellido, m.telefono, m.celular,
             m.email, m.sector_id, s.nombre, m.estado, m.foto_url
    ORDER BY m.apellido, m.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =============================================================================
-- STEP 8: get_multiplicadores function
-- =============================================================================
-- Returns multiplicadores for a given coordinator, with count of relacionados.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_multiplicadores(
    p_coordinador_id UUID,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    cedula VARCHAR,
    nombre VARCHAR,
    apellido VARCHAR,
    telefono VARCHAR,
    celular VARCHAR,
    email VARCHAR,
    sector_id UUID,
    sector_nombre VARCHAR,
    estado BOOLEAN,
    foto_url VARCHAR,
    relacionado_count BIGINT
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, public.get_my_tenant_id());

    RETURN QUERY
    SELECT
        m.id,
        m.cedula,
        m.nombre,
        m.apellido,
        m.telefono,
        m.celular,
        m.email,
        m.sector_id,
        s.nombre AS sector_nombre,
        m.estado,
        m.foto_url,
        COUNT(rel.id) AS relacionado_count
    FROM miembros m
    LEFT JOIN sectores s ON s.id = m.sector_id
    LEFT JOIN miembros rel ON rel.coordinador_id = m.id AND rel.tipo_miembro = 'relacionado'
    WHERE m.tenant_id = v_tenant_id
        AND m.tipo_miembro = 'multiplicador'
        AND m.coordinador_id = p_coordinador_id
        AND m.estado = true
    GROUP BY m.id, m.cedula, m.nombre, m.apellido, m.telefono, m.celular,
             m.email, m.sector_id, s.nombre, m.estado, m.foto_url
    ORDER BY m.apellido, m.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =============================================================================
-- STEP 9: get_relacionados function
-- =============================================================================
-- Returns relacionados for a given multiplicador.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_relacionados(
    p_multiplicador_id UUID,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    cedula VARCHAR,
    nombre VARCHAR,
    apellido VARCHAR,
    telefono VARCHAR,
    celular VARCHAR,
    email VARCHAR,
    sector_id UUID,
    sector_nombre VARCHAR,
    estado BOOLEAN,
    foto_url VARCHAR
) AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, public.get_my_tenant_id());

    RETURN QUERY
    SELECT
        m.id,
        m.cedula,
        m.nombre,
        m.apellido,
        m.telefono,
        m.celular,
        m.email,
        m.sector_id,
        s.nombre AS sector_nombre,
        m.estado,
        m.foto_url
    FROM miembros m
    LEFT JOIN sectores s ON s.id = m.sector_id
    WHERE m.tenant_id = v_tenant_id
        AND m.tipo_miembro = 'relacionado'
        AND m.coordinador_id = p_multiplicador_id
        AND m.estado = true
    ORDER BY m.apellido, m.nombre;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
