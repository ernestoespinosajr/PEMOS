-- =============================================================================
-- Migration: Row-Level Security Policies for All Data Tables
-- =============================================================================
-- Implements two-layer RLS:
--   Layer 1: Tenant isolation (every query is scoped to the user's tenant_id)
--   Layer 2: Role-based access with geographic scope enforcement
--
-- JWT claims (injected by custom_access_token_hook):
--   - role: admin | coordinator | observer | field_worker
--   - tenant_id: UUID
--   - geographic_scope: { level: 'provincia'|'municipio'|'circunscripcion', id: UUID } | null
--
-- Geographic hierarchy:
--   provincias > municipios > circunscripciones > sectores > comites > niveles_intermedios
--
-- Rollback:
--   Run the entire "Down Migration" section at the bottom of this file.
-- =============================================================================


-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function: get_my_tenant_id()
-- Returns the authenticated user's tenant_id from JWT claims.
-- Used in all tenant isolation policies.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt()->>'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: get_my_role()
-- Returns the authenticated user's role from JWT claims.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt()->>'role';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: get_my_scope_level()
-- Returns the geographic scope level (provincia, municipio, circunscripcion)
-- or NULL if the user has no scope restriction (e.g., admin).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_scope_level()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt()->'geographic_scope'->>'level';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: get_my_scope_id()
-- Returns the geographic scope entity UUID, or NULL if unrestricted.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_scope_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt()->'geographic_scope'->>'id')::UUID;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: resolve_sector_provincia_id(sector_uuid)
-- Given a sector_id, traverses the hierarchy up to find the provincia_id.
-- Returns NULL if the sector_id is NULL or not found.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_sector_provincia_id(p_sector_id UUID)
RETURNS UUID AS $$
DECLARE
  v_provincia_id UUID;
BEGIN
  IF p_sector_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT m.provincia_id
  INTO v_provincia_id
  FROM sectores s
  JOIN circunscripciones c ON s.circunscripcion_id = c.id
  JOIN municipios m ON c.municipio_id = m.id
  WHERE s.id = p_sector_id;

  RETURN v_provincia_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: resolve_sector_municipio_id(sector_uuid)
-- Given a sector_id, traverses the hierarchy up to find the municipio_id.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_sector_municipio_id(p_sector_id UUID)
RETURNS UUID AS $$
DECLARE
  v_municipio_id UUID;
BEGIN
  IF p_sector_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT m.id
  INTO v_municipio_id
  FROM sectores s
  JOIN circunscripciones c ON s.circunscripcion_id = c.id
  JOIN municipios m ON c.municipio_id = m.id
  WHERE s.id = p_sector_id;

  RETURN v_municipio_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: resolve_sector_circunscripcion_id(sector_uuid)
-- Given a sector_id, returns the parent circunscripcion_id.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_sector_circunscripcion_id(p_sector_id UUID)
RETURNS UUID AS $$
DECLARE
  v_circunscripcion_id UUID;
BEGIN
  IF p_sector_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.circunscripcion_id
  INTO v_circunscripcion_id
  FROM sectores s
  WHERE s.id = p_sector_id;

  RETURN v_circunscripcion_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: is_within_scope_via_sector(sector_id)
-- Checks if a record's sector_id falls within the authenticated user's
-- geographic scope. Used for miembros and seguimiento_no_inscritos.
-- Returns TRUE if no scope restriction (admin), or if the sector's ancestor
-- matches the user's scope entity.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_within_scope_via_sector(p_sector_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_scope_level TEXT;
  v_scope_id UUID;
BEGIN
  v_scope_level := public.get_my_scope_level();
  v_scope_id := public.get_my_scope_id();

  -- No scope restriction (e.g., admin with NULL geographic_scope)
  IF v_scope_level IS NULL OR v_scope_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- If the record has no sector, we cannot verify scope -- deny
  IF p_sector_id IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE v_scope_level
    WHEN 'provincia' THEN
      RETURN public.resolve_sector_provincia_id(p_sector_id) = v_scope_id;
    WHEN 'municipio' THEN
      RETURN public.resolve_sector_municipio_id(p_sector_id) = v_scope_id;
    WHEN 'circunscripcion' THEN
      RETURN public.resolve_sector_circunscripcion_id(p_sector_id) = v_scope_id;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: is_within_scope_via_recinto(recinto_id)
-- Checks if a record's recinto_id falls within the user's geographic scope.
-- Recintos have municipio_id and circunscripcion_id directly.
-- Used for votaciones and asignacion_recintos.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_within_scope_via_recinto(p_recinto_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_scope_level TEXT;
  v_scope_id UUID;
  v_recinto_municipio_id UUID;
  v_recinto_circunscripcion_id UUID;
  v_recinto_provincia_id UUID;
BEGIN
  v_scope_level := public.get_my_scope_level();
  v_scope_id := public.get_my_scope_id();

  -- No scope restriction
  IF v_scope_level IS NULL OR v_scope_id IS NULL THEN
    RETURN TRUE;
  END IF;

  IF p_recinto_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT r.municipio_id, r.circunscripcion_id, m.provincia_id
  INTO v_recinto_municipio_id, v_recinto_circunscripcion_id, v_recinto_provincia_id
  FROM recintos r
  JOIN municipios m ON r.municipio_id = m.id
  WHERE r.id = p_recinto_id;

  CASE v_scope_level
    WHEN 'provincia' THEN
      RETURN v_recinto_provincia_id = v_scope_id;
    WHEN 'municipio' THEN
      RETURN v_recinto_municipio_id = v_scope_id;
    WHEN 'circunscripcion' THEN
      RETURN v_recinto_circunscripcion_id = v_scope_id;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Function: is_within_scope_cronograma(nivel_geografico, nivel_id)
-- Checks if a cronograma record's polymorphic geographic reference
-- falls within the user's scope. cronogramas uses nivel_geografico (text)
-- and nivel_id (UUID) to point to any geographic level.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_within_scope_cronograma(
  p_nivel_geografico TEXT,
  p_nivel_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_scope_level TEXT;
  v_scope_id UUID;
  v_municipio_id UUID;
  v_provincia_id UUID;
BEGIN
  v_scope_level := public.get_my_scope_level();
  v_scope_id := public.get_my_scope_id();

  -- No scope restriction
  IF v_scope_level IS NULL OR v_scope_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- If no geographic reference on the cronograma, allow (tenant-wide schedule)
  IF p_nivel_geografico IS NULL OR p_nivel_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Direct match: if the cronograma's level and id match the user's scope
  IF p_nivel_geografico = v_scope_level AND p_nivel_id = v_scope_id THEN
    RETURN TRUE;
  END IF;

  -- Check if the cronograma's geographic entity is an ancestor of the user's scope
  -- or if it falls within the user's scope
  CASE v_scope_level
    WHEN 'provincia' THEN
      -- User scoped to provincia: allow if cronograma is for this provincia,
      -- or for a municipio/circunscripcion within this provincia
      CASE p_nivel_geografico
        WHEN 'provincia' THEN
          RETURN p_nivel_id = v_scope_id;
        WHEN 'municipio' THEN
          SELECT provincia_id INTO v_provincia_id FROM municipios WHERE id = p_nivel_id;
          RETURN v_provincia_id = v_scope_id;
        WHEN 'circunscripcion' THEN
          SELECT m.provincia_id INTO v_provincia_id
          FROM circunscripciones c JOIN municipios m ON c.municipio_id = m.id
          WHERE c.id = p_nivel_id;
          RETURN v_provincia_id = v_scope_id;
        ELSE
          RETURN FALSE;
      END CASE;

    WHEN 'municipio' THEN
      -- User scoped to municipio
      CASE p_nivel_geografico
        WHEN 'provincia' THEN
          -- Cronograma is province-wide: allow if this is the user's province
          SELECT provincia_id INTO v_provincia_id FROM municipios WHERE id = v_scope_id;
          RETURN p_nivel_id = v_provincia_id;
        WHEN 'municipio' THEN
          RETURN p_nivel_id = v_scope_id;
        WHEN 'circunscripcion' THEN
          SELECT municipio_id INTO v_municipio_id FROM circunscripciones WHERE id = p_nivel_id;
          RETURN v_municipio_id = v_scope_id;
        ELSE
          RETURN FALSE;
      END CASE;

    WHEN 'circunscripcion' THEN
      -- User scoped to circunscripcion
      CASE p_nivel_geografico
        WHEN 'provincia' THEN
          SELECT m.provincia_id INTO v_provincia_id
          FROM circunscripciones c JOIN municipios m ON c.municipio_id = m.id
          WHERE c.id = v_scope_id;
          RETURN p_nivel_id = v_provincia_id;
        WHEN 'municipio' THEN
          SELECT municipio_id INTO v_municipio_id FROM circunscripciones WHERE id = v_scope_id;
          RETURN p_nivel_id = v_municipio_id;
        WHEN 'circunscripcion' THEN
          RETURN p_nivel_id = v_scope_id;
        ELSE
          RETURN FALSE;
      END CASE;

    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================
-- FORCE ensures RLS applies even to table owners (important for Supabase).

ALTER TABLE provincias ENABLE ROW LEVEL SECURITY;
ALTER TABLE provincias FORCE ROW LEVEL SECURITY;

ALTER TABLE municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipios FORCE ROW LEVEL SECURITY;

ALTER TABLE circunscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE circunscripciones FORCE ROW LEVEL SECURITY;

ALTER TABLE sectores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectores FORCE ROW LEVEL SECURITY;

ALTER TABLE comites ENABLE ROW LEVEL SECURITY;
ALTER TABLE comites FORCE ROW LEVEL SECURITY;

ALTER TABLE niveles_intermedios ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveles_intermedios FORCE ROW LEVEL SECURITY;

ALTER TABLE miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros FORCE ROW LEVEL SECURITY;

ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos FORCE ROW LEVEL SECURITY;

ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos FORCE ROW LEVEL SECURITY;

ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatos FORCE ROW LEVEL SECURITY;

ALTER TABLE recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recintos FORCE ROW LEVEL SECURITY;

ALTER TABLE votaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE votaciones FORCE ROW LEVEL SECURITY;

ALTER TABLE candidato_votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidato_votos FORCE ROW LEVEL SECURITY;

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;

ALTER TABLE asignacion_recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_recintos FORCE ROW LEVEL SECURITY;

ALTER TABLE seguimiento_no_inscritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_no_inscritos FORCE ROW LEVEL SECURITY;

ALTER TABLE cronogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronogramas FORCE ROW LEVEL SECURITY;


-- =============================================================================
-- GEOGRAPHIC TABLES: provincias, municipios, circunscripciones,
--                    sectores, comites, niveles_intermedios
-- =============================================================================
-- These are reference data. All authenticated users can SELECT.
-- Only admin can INSERT/UPDATE/DELETE.
-- Tenant isolation: tenant_id match OR tenant_id IS NULL (shared reference data).
-- =============================================================================

-- ---- PROVINCIAS ----

CREATE POLICY "provincias_select_authenticated"
  ON provincias FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "provincias_insert_admin"
  ON provincias FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "provincias_update_admin"
  ON provincias FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "provincias_delete_admin"
  ON provincias FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

-- ---- MUNICIPIOS ----

CREATE POLICY "municipios_select_authenticated"
  ON municipios FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "municipios_insert_admin"
  ON municipios FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "municipios_update_admin"
  ON municipios FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "municipios_delete_admin"
  ON municipios FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

-- ---- CIRCUNSCRIPCIONES ----

CREATE POLICY "circunscripciones_select_authenticated"
  ON circunscripciones FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "circunscripciones_insert_admin"
  ON circunscripciones FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "circunscripciones_update_admin"
  ON circunscripciones FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "circunscripciones_delete_admin"
  ON circunscripciones FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

-- ---- SECTORES ----

CREATE POLICY "sectores_select_authenticated"
  ON sectores FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "sectores_insert_admin"
  ON sectores FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "sectores_update_admin"
  ON sectores FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "sectores_delete_admin"
  ON sectores FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

-- ---- COMITES ----

CREATE POLICY "comites_select_authenticated"
  ON comites FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "comites_insert_admin"
  ON comites FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "comites_update_admin"
  ON comites FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "comites_delete_admin"
  ON comites FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

-- ---- NIVELES_INTERMEDIOS ----

CREATE POLICY "niveles_intermedios_select_authenticated"
  ON niveles_intermedios FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "niveles_intermedios_insert_admin"
  ON niveles_intermedios FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "niveles_intermedios_update_admin"
  ON niveles_intermedios FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );

CREATE POLICY "niveles_intermedios_delete_admin"
  ON niveles_intermedios FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'admin'
    AND (tenant_id = public.get_my_tenant_id() OR tenant_id IS NULL)
  );


-- =============================================================================
-- MIEMBROS (Members)
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator: full CRUD within geographic scope
-- Field Worker: full CRUD within geographic scope
-- Observer: no access
-- =============================================================================

CREATE POLICY "miembros_select"
  ON miembros FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  );

CREATE POLICY "miembros_insert"
  ON miembros FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  );

CREATE POLICY "miembros_update"
  ON miembros FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  );

CREATE POLICY "miembros_delete"
  ON miembros FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  );


-- =============================================================================
-- ELECTORAL REFERENCE TABLES: partidos, cargos, candidatos, recintos
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator: SELECT only (reference data)
-- Observer: SELECT only
-- Field Worker: no access
-- =============================================================================

-- ---- PARTIDOS ----

CREATE POLICY "partidos_select"
  ON partidos FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
  );

CREATE POLICY "partidos_insert_admin"
  ON partidos FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "partidos_update_admin"
  ON partidos FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "partidos_delete_admin"
  ON partidos FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

-- ---- CARGOS ----

CREATE POLICY "cargos_select"
  ON cargos FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
  );

CREATE POLICY "cargos_insert_admin"
  ON cargos FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "cargos_update_admin"
  ON cargos FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "cargos_delete_admin"
  ON cargos FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

-- ---- CANDIDATOS ----

CREATE POLICY "candidatos_select"
  ON candidatos FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
  );

CREATE POLICY "candidatos_insert_admin"
  ON candidatos FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "candidatos_update_admin"
  ON candidatos FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "candidatos_delete_admin"
  ON candidatos FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

-- ---- RECINTOS ----

CREATE POLICY "recintos_select"
  ON recintos FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
  );

CREATE POLICY "recintos_insert_admin"
  ON recintos FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "recintos_update_admin"
  ON recintos FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "recintos_delete_admin"
  ON recintos FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );


-- =============================================================================
-- VOTACIONES (Vote Records)
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator: SELECT + INSERT + UPDATE within geographic scope (via recinto)
-- Observer: SELECT only within tenant
-- Field Worker: no access
-- =============================================================================

CREATE POLICY "votaciones_select"
  ON votaciones FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
    AND (
      public.get_my_role() IN ('admin', 'observer')
      OR public.is_within_scope_via_recinto(recinto_id)
    )
  );

CREATE POLICY "votaciones_insert"
  ON votaciones FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_recinto(recinto_id)
    )
  );

CREATE POLICY "votaciones_update"
  ON votaciones FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_recinto(recinto_id)
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_recinto(recinto_id)
    )
  );

CREATE POLICY "votaciones_delete_admin"
  ON votaciones FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );


-- =============================================================================
-- CANDIDATO_VOTOS (Candidate Vote Tallies)
-- =============================================================================
-- Same access pattern as votaciones, but scope check is via
-- the parent votacion's recinto.
-- Admin: full CRUD
-- Coordinator: SELECT + INSERT + UPDATE within scope
-- Observer: SELECT only
-- Field Worker: no access
-- =============================================================================

CREATE POLICY "candidato_votos_select"
  ON candidato_votos FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'observer')
    AND (
      public.get_my_role() IN ('admin', 'observer')
      OR public.is_within_scope_via_recinto(
        (SELECT v.recinto_id FROM votaciones v WHERE v.id = candidato_votos.votacion_id)
      )
    )
  );

CREATE POLICY "candidato_votos_insert"
  ON candidato_votos FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_recinto(
        (SELECT v.recinto_id FROM votaciones v WHERE v.id = votacion_id)
      )
    )
  );

CREATE POLICY "candidato_votos_update"
  ON candidato_votos FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_recinto(
        (SELECT v.recinto_id FROM votaciones v WHERE v.id = candidato_votos.votacion_id)
      )
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_recinto(
        (SELECT v.recinto_id FROM votaciones v WHERE v.id = candidato_votos.votacion_id)
      )
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
-- USUARIOS (Users)
-- =============================================================================
-- Admin: full CRUD within tenant
-- Others: SELECT own record only (matched via auth.uid() = auth_user_id)
-- =============================================================================

CREATE POLICY "usuarios_select_own"
  ON usuarios FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() = 'admin'
      OR auth_user_id = auth.uid()
    )
  );

CREATE POLICY "usuarios_insert_admin"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "usuarios_update"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() = 'admin'
      OR auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() = 'admin'
      OR auth_user_id = auth.uid()
    )
  );

CREATE POLICY "usuarios_delete_admin"
  ON usuarios FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );


-- =============================================================================
-- ASIGNACION_RECINTOS (Precinct Assignments)
-- =============================================================================
-- Admin: full CRUD within tenant
-- Others: SELECT own assignments only (matched via usuario_id -> auth_user_id)
-- =============================================================================

CREATE POLICY "asignacion_recintos_select"
  ON asignacion_recintos FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() = 'admin'
      OR usuario_id = (
        SELECT u.id FROM usuarios u WHERE u.auth_user_id = auth.uid()
      )
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
-- SEGUIMIENTO_NO_INSCRITOS (Unregistered Voter Tracking)
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator: full CRUD within geographic scope (via sector_id)
-- Field Worker: full CRUD within geographic scope (via sector_id)
-- Observer: no access
-- =============================================================================

CREATE POLICY "seguimiento_select"
  ON seguimiento_no_inscritos FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  );

CREATE POLICY "seguimiento_insert"
  ON seguimiento_no_inscritos FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  );

CREATE POLICY "seguimiento_update"
  ON seguimiento_no_inscritos FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  );

CREATE POLICY "seguimiento_delete"
  ON seguimiento_no_inscritos FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR public.is_within_scope_via_sector(sector_id)
    )
  );


-- =============================================================================
-- CRONOGRAMAS (Electoral Schedules)
-- =============================================================================
-- Admin: full CRUD within tenant
-- Coordinator: SELECT within geographic scope
-- Observer: SELECT within tenant (all schedules visible)
-- Field Worker: SELECT within geographic scope
-- =============================================================================

CREATE POLICY "cronogramas_select"
  ON cronogramas FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() IN ('admin', 'observer')
      OR (
        public.get_my_role() IN ('coordinator', 'field_worker')
        AND public.is_within_scope_cronograma(nivel_geografico, nivel_id)
      )
    )
  );

CREATE POLICY "cronogramas_insert_admin"
  ON cronogramas FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "cronogramas_update_admin"
  ON cronogramas FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "cronogramas_delete_admin"
  ON cronogramas FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
  );


-- =============================================================================
-- GRANT PERMISSIONS TO ROLES
-- =============================================================================
-- Supabase uses the `anon` and `authenticated` roles.
-- All data access for authenticated users goes through RLS policies.
-- The anon role should have NO access to data tables.
-- =============================================================================

-- Revoke all from anon on all data tables
REVOKE ALL ON provincias FROM anon;
REVOKE ALL ON municipios FROM anon;
REVOKE ALL ON circunscripciones FROM anon;
REVOKE ALL ON sectores FROM anon;
REVOKE ALL ON comites FROM anon;
REVOKE ALL ON niveles_intermedios FROM anon;
REVOKE ALL ON miembros FROM anon;
REVOKE ALL ON partidos FROM anon;
REVOKE ALL ON cargos FROM anon;
REVOKE ALL ON candidatos FROM anon;
REVOKE ALL ON recintos FROM anon;
REVOKE ALL ON votaciones FROM anon;
REVOKE ALL ON candidato_votos FROM anon;
REVOKE ALL ON usuarios FROM anon;
REVOKE ALL ON asignacion_recintos FROM anon;
REVOKE ALL ON seguimiento_no_inscritos FROM anon;
REVOKE ALL ON cronogramas FROM anon;

-- Grant full table access to authenticated (RLS policies control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON provincias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON municipios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON circunscripciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sectores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON niveles_intermedios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON miembros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON partidos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cargos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON candidatos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recintos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON votaciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON candidato_votos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON asignacion_recintos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON seguimiento_no_inscritos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cronogramas TO authenticated;

-- Grant execute on helper functions to authenticated
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_scope_level TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_scope_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_sector_provincia_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_sector_municipio_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_sector_circunscripcion_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_within_scope_via_sector TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_within_scope_via_recinto TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_within_scope_cronograma TO authenticated;


-- =============================================================================
-- DOWN MIGRATION (Rollback)
-- =============================================================================
-- To roll back this migration, run the following statements in order:
--
-- -- Drop all policies
-- DO $$ DECLARE r RECORD;
-- BEGIN
--   FOR r IN (
--     SELECT schemaname, tablename, policyname
--     FROM pg_policies
--     WHERE schemaname = 'public'
--   ) LOOP
--     EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
--       r.policyname, r.schemaname, r.tablename);
--   END LOOP;
-- END $$;
--
-- -- Disable RLS on all tables
-- ALTER TABLE provincias DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE municipios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE circunscripciones DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sectores DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comites DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE niveles_intermedios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE miembros DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE partidos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cargos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE candidatos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE recintos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE votaciones DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE candidato_votos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE asignacion_recintos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE seguimiento_no_inscritos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cronogramas DISABLE ROW LEVEL SECURITY;
--
-- -- Drop helper functions
-- DROP FUNCTION IF EXISTS public.is_within_scope_cronograma;
-- DROP FUNCTION IF EXISTS public.is_within_scope_via_recinto;
-- DROP FUNCTION IF EXISTS public.is_within_scope_via_sector;
-- DROP FUNCTION IF EXISTS public.resolve_sector_circunscripcion_id;
-- DROP FUNCTION IF EXISTS public.resolve_sector_municipio_id;
-- DROP FUNCTION IF EXISTS public.resolve_sector_provincia_id;
-- DROP FUNCTION IF EXISTS public.get_my_scope_id;
-- DROP FUNCTION IF EXISTS public.get_my_scope_level;
-- DROP FUNCTION IF EXISTS public.get_my_role;
-- DROP FUNCTION IF EXISTS public.get_my_tenant_id;
-- =============================================================================
