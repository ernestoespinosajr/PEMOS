-- =============================================================================
-- Migration: Platform Admin RLS Policies (ftr-011 Phase 2)
-- =============================================================================
-- Creates RLS policies on the tenants table and adds platform_admin bypass
-- policies on ALL existing data tables so that platform administrators can
-- perform cross-tenant operations.
--
-- Design decisions:
--   - Platform admins get SEPARATE policies (not modifying existing ones).
--     This is safer than altering existing policies and easier to rollback.
--   - Platform admin policies are named with a "_platform_admin" suffix.
--   - Regular tenant-scoped policies remain unchanged -- they continue to
--     work for admin, coordinator, observer, and field_worker roles.
--   - Tenants table: platform_admin gets full CRUD; regular admin gets
--     SELECT on their own tenant only.
--
-- Rollback:
--   -- Tenants table policies
--   DROP POLICY IF EXISTS "tenants_select_platform_admin" ON tenants;
--   DROP POLICY IF EXISTS "tenants_insert_platform_admin" ON tenants;
--   DROP POLICY IF EXISTS "tenants_update_platform_admin" ON tenants;
--   DROP POLICY IF EXISTS "tenants_delete_platform_admin" ON tenants;
--   DROP POLICY IF EXISTS "tenants_select_own_tenant" ON tenants;
--   -- Platform admin bypass policies on all data tables
--   DROP POLICY IF EXISTS "provincias_platform_admin" ON provincias;
--   DROP POLICY IF EXISTS "municipios_platform_admin" ON municipios;
--   DROP POLICY IF EXISTS "circunscripciones_platform_admin" ON circunscripciones;
--   DROP POLICY IF EXISTS "sectores_platform_admin" ON sectores;
--   DROP POLICY IF EXISTS "comites_platform_admin" ON comites;
--   DROP POLICY IF EXISTS "niveles_intermedios_platform_admin" ON niveles_intermedios;
--   DROP POLICY IF EXISTS "miembros_platform_admin" ON miembros;
--   DROP POLICY IF EXISTS "partidos_platform_admin" ON partidos;
--   DROP POLICY IF EXISTS "cargos_platform_admin" ON cargos;
--   DROP POLICY IF EXISTS "candidatos_platform_admin" ON candidatos;
--   DROP POLICY IF EXISTS "recintos_platform_admin" ON recintos;
--   DROP POLICY IF EXISTS "candidato_votos_platform_admin" ON candidato_votos;
--   DROP POLICY IF EXISTS "partido_votos_platform_admin" ON partido_votos;
--   DROP POLICY IF EXISTS "colegios_platform_admin" ON colegios;
--   DROP POLICY IF EXISTS "periodos_electorales_platform_admin" ON periodos_electorales;
--   DROP POLICY IF EXISTS "actas_platform_admin" ON actas;
--   DROP POLICY IF EXISTS "usuarios_platform_admin" ON usuarios;
--   DROP POLICY IF EXISTS "asignacion_recintos_platform_admin" ON asignacion_recintos;
--   DROP POLICY IF EXISTS "cronogramas_platform_admin" ON cronogramas;
--   DROP POLICY IF EXISTS "seguimiento_no_inscritos_platform_admin" ON seguimiento_no_inscritos;
--   DROP POLICY IF EXISTS "seguimiento_historial_platform_admin" ON seguimiento_no_inscritos_historial;
--   DROP POLICY IF EXISTS "padron_externo_platform_admin" ON padron_externo;
--   DROP POLICY IF EXISTS "plantillas_llamada_platform_admin" ON plantillas_llamada;
--   DROP POLICY IF EXISTS "auth_audit_log_platform_admin" ON auth_audit_log;
-- =============================================================================


-- =============================================================================
-- TENANTS TABLE POLICIES
-- =============================================================================

-- Platform admin: full CRUD on all tenants
CREATE POLICY "tenants_select_platform_admin"
    ON tenants FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

CREATE POLICY "tenants_insert_platform_admin"
    ON tenants FOR INSERT
    TO authenticated
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "tenants_update_platform_admin"
    ON tenants FOR UPDATE
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "tenants_delete_platform_admin"
    ON tenants FOR DELETE
    TO authenticated
    USING (public.is_platform_admin());

-- Regular admin: SELECT their own tenant only (for branding, settings, usage)
CREATE POLICY "tenants_select_own_tenant"
    ON tenants FOR SELECT
    TO authenticated
    USING (
        id = public.get_my_tenant_id()
        AND public.get_my_role() = 'admin'
    );


-- =============================================================================
-- PLATFORM ADMIN BYPASS POLICIES ON ALL DATA TABLES
-- =============================================================================
-- These policies grant platform_admin full access (ALL operations) to every
-- data table, bypassing tenant isolation. This is necessary for platform
-- administration tasks such as inspecting tenant data, resolving support
-- issues, and performing cross-tenant analytics.
--
-- Each policy uses FOR ALL (covers SELECT, INSERT, UPDATE, DELETE) with
-- is_platform_admin() as both USING and WITH CHECK.
-- =============================================================================

-- Geographic tables
CREATE POLICY "provincias_platform_admin"
    ON provincias FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "municipios_platform_admin"
    ON municipios FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "circunscripciones_platform_admin"
    ON circunscripciones FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "sectores_platform_admin"
    ON sectores FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "comites_platform_admin"
    ON comites FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "niveles_intermedios_platform_admin"
    ON niveles_intermedios FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Member table
CREATE POLICY "miembros_platform_admin"
    ON miembros FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Electoral reference tables
CREATE POLICY "partidos_platform_admin"
    ON partidos FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "cargos_platform_admin"
    ON cargos FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "candidatos_platform_admin"
    ON candidatos FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "recintos_platform_admin"
    ON recintos FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Electoral monitoring tables
CREATE POLICY "periodos_electorales_platform_admin"
    ON periodos_electorales FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "colegios_platform_admin"
    ON colegios FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "candidato_votos_platform_admin"
    ON candidato_votos FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "partido_votos_platform_admin"
    ON partido_votos FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "actas_platform_admin"
    ON actas FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- User and operations tables
CREATE POLICY "usuarios_platform_admin"
    ON usuarios FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "asignacion_recintos_platform_admin"
    ON asignacion_recintos FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "cronogramas_platform_admin"
    ON cronogramas FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Seguimiento tables
CREATE POLICY "seguimiento_no_inscritos_platform_admin"
    ON seguimiento_no_inscritos FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "seguimiento_historial_platform_admin"
    ON seguimiento_no_inscritos_historial FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "padron_externo_platform_admin"
    ON padron_externo FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "plantillas_llamada_platform_admin"
    ON plantillas_llamada FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Audit log table (SELECT only for platform admin -- no INSERT/UPDATE/DELETE)
CREATE POLICY "auth_audit_log_platform_admin"
    ON auth_audit_log FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());
