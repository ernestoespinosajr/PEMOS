-- =============================================================================
-- Migration: Movimientos — JWT Claims, Helper Function, and RLS Policies
-- =============================================================================
-- Part A: get_my_movimiento_id() helper — reads movimiento_id from JWT claims
-- Part B: Extend custom_access_token_hook to inject movimiento_id and
--         force_password_change into JWT
-- Part C: RLS policies for movimientos table, updated miembros and usuarios
--         policies with movimiento scope, and check_cedula_duplicado RPC
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.check_cedula_duplicado(TEXT);
--   DROP POLICY IF EXISTS "usuarios_delete_scoped_admin" ON usuarios;
--   DROP POLICY IF EXISTS "usuarios_update_scoped_admin" ON usuarios;
--   DROP POLICY IF EXISTS "usuarios_insert_scoped_admin" ON usuarios;
--   DROP POLICY IF EXISTS "usuarios_select_supervisor" ON usuarios;
--   DROP POLICY IF EXISTS "miembros_delete_v2" ON miembros;
--   DROP POLICY IF EXISTS "miembros_update_v2" ON miembros;
--   DROP POLICY IF EXISTS "miembros_insert_v2" ON miembros;
--   DROP POLICY IF EXISTS "miembros_select_v2" ON miembros;
--   DROP POLICY IF EXISTS "movimientos_delete" ON movimientos;
--   DROP POLICY IF EXISTS "movimientos_update" ON movimientos;
--   DROP POLICY IF EXISTS "movimientos_insert" ON movimientos;
--   DROP POLICY IF EXISTS "movimientos_select" ON movimientos;
--   ALTER TABLE movimientos DISABLE ROW LEVEL SECURITY;
--   -- Restore previous custom_access_token_hook from 20260410000013
--   DROP FUNCTION IF EXISTS public.get_my_movimiento_id();
-- =============================================================================


-- =============================================================================
-- PART A: Helper function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_movimiento_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT NULLIF(auth.jwt()->>'movimiento_id', '')::UUID;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_movimiento_id() TO authenticated;


-- =============================================================================
-- PART B: Update custom_access_token_hook
-- =============================================================================
-- Extends the hook from 20260410000013 to additionally inject:
--   movimiento_id        - from usuarios.movimiento_id (nullable)
--   force_password_change - from usuarios.force_password_change (default false)

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
    claims JSONB;
    user_role TEXT;
    user_tenant_id UUID;
    user_provincia_id UUID;
    user_municipio_id UUID;
    user_circunscripcion_id UUID;
    user_movimiento_id UUID;
    user_force_password_change BOOLEAN;
    tenant_activo BOOLEAN;
    tenant_config JSONB;
BEGIN
    -- Look up user in usuarios table
    SELECT
        u.role::TEXT, u.tenant_id,
        u.provincia_id, u.municipio_id, u.circunscripcion_id,
        u.movimiento_id, u.force_password_change
    INTO
        user_role, user_tenant_id,
        user_provincia_id, user_municipio_id, user_circunscripcion_id,
        user_movimiento_id, user_force_password_change
    FROM public.usuarios u
    WHERE u.auth_user_id = (event->>'user_id')::UUID;

    -- If no user found, return event unchanged
    IF user_role IS NULL THEN
        RETURN event;
    END IF;

    -- Check if tenant is active (skip for platform_admin — they always have access)
    IF user_role != 'platform_admin' AND user_tenant_id IS NOT NULL THEN
        SELECT t.activo INTO tenant_activo
        FROM public.tenants t
        WHERE t.id = user_tenant_id;

        -- If tenant is suspended/inactive, return minimal claims with suspended flag
        IF tenant_activo IS NOT TRUE THEN
            claims := event->'claims';
            claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
            claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));
            claims := jsonb_set(claims, '{tenant_suspended}', 'true'::jsonb);
            event := jsonb_set(event, '{claims}', claims);
            RETURN event;
        END IF;
    END IF;

    -- Build claims from existing token claims
    claims := event->'claims';

    -- Inject app_role and tenant_id
    claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));

    -- Inject tenant branding for non-platform-admin users
    IF user_role != 'platform_admin' AND user_tenant_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'nombre', t.nombre,
            'slug', t.slug,
            'logo_url', t.logo_url,
            'color_primario', t.color_primario,
            'color_secundario', t.color_secundario,
            'plan', t.plan
        ) INTO tenant_config
        FROM public.tenants t
        WHERE t.id = user_tenant_id;

        IF tenant_config IS NOT NULL THEN
            claims := jsonb_set(claims, '{tenant_config}', tenant_config);
        END IF;
    END IF;

    -- Build geographic scope based on the most specific level available
    IF user_provincia_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{geographic_scope}', jsonb_build_object(
            'level', CASE
                WHEN user_circunscripcion_id IS NOT NULL THEN 'circunscripcion'
                WHEN user_municipio_id IS NOT NULL THEN 'municipio'
                ELSE 'provincia'
            END,
            'id', COALESCE(user_circunscripcion_id, user_municipio_id, user_provincia_id)
        ));
    ELSE
        claims := jsonb_set(claims, '{geographic_scope}', 'null'::jsonb);
    END IF;

    -- Inject movimiento_id (null when user is tenant-level, non-null when scoped)
    IF user_movimiento_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{movimiento_id}', to_jsonb(user_movimiento_id));
    ELSE
        claims := jsonb_set(claims, '{movimiento_id}', 'null'::jsonb);
    END IF;

    -- Inject force_password_change flag
    claims := jsonb_set(
        claims,
        '{force_password_change}',
        to_jsonb(COALESCE(user_force_password_change, false))
    );

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Preserve grants from previous migrations
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
GRANT SELECT ON TABLE public.usuarios TO supabase_auth_admin;
GRANT SELECT ON TABLE public.tenants TO supabase_auth_admin;


-- =============================================================================
-- PART C: RLS Policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- C.1: Enable RLS on movimientos
-- ---------------------------------------------------------------------------

ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos FORCE ROW LEVEL SECURITY;

REVOKE ALL ON movimientos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON movimientos TO authenticated;

-- SELECT: platform_admin sees all; admin sees all in their tenant;
--   scoped user (movimiento_id set) sees only their own movimiento;
--   unscopped tenant users see all movimientos in their tenant
CREATE POLICY "movimientos_select" ON movimientos FOR SELECT
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
        OR public.get_my_movimiento_id() IS NULL
      )
    )
  );

-- INSERT: only tenant-level admin (no movimiento scope) can create movimientos
CREATE POLICY "movimientos_insert" ON movimientos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (
      tenant_id = public.get_my_tenant_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_movimiento_id() IS NULL
    )
  );

-- UPDATE: only tenant-level admin
CREATE POLICY "movimientos_update" ON movimientos FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      tenant_id = public.get_my_tenant_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_movimiento_id() IS NULL
    )
  );

-- DELETE: only tenant-level admin
CREATE POLICY "movimientos_delete" ON movimientos FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      tenant_id = public.get_my_tenant_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_movimiento_id() IS NULL
    )
  );


-- ---------------------------------------------------------------------------
-- C.2: Update miembros RLS policies to add movimiento scope
-- ---------------------------------------------------------------------------
-- The previous policies (from 20260409000002 and subsequent patches) used
-- 'miembros_select', 'miembros_insert', 'miembros_update', 'miembros_delete'.
-- We drop and recreate them with movimiento scope awareness.
-- supervisor role gets SELECT-only access to their movimiento's members.

DROP POLICY IF EXISTS "miembros_select" ON miembros;
DROP POLICY IF EXISTS "miembros_insert" ON miembros;
DROP POLICY IF EXISTS "miembros_update" ON miembros;
DROP POLICY IF EXISTS "miembros_delete" ON miembros;

-- SELECT: admin (full tenant), supervisor (own movimiento), coordinator/field_worker
--   (geographic scope AND movimiento scope if set)
CREATE POLICY "miembros_select_v2"
  ON miembros FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'supervisor', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR (
        -- scoped user: must match their movimiento (if set) AND geographic scope
        public.get_my_role() = 'supervisor'
        AND public.get_my_movimiento_id() IS NOT NULL
        AND movimiento_id = public.get_my_movimiento_id()
      )
      OR (
        public.get_my_role() IN ('coordinator', 'field_worker')
        AND public.is_within_scope_via_sector(sector_id)
        AND (
          public.get_my_movimiento_id() IS NULL
          OR movimiento_id = public.get_my_movimiento_id()
        )
      )
    )
  );

-- INSERT: admin and coordinator/field_worker within their scope and movimiento
CREATE POLICY "miembros_insert_v2"
  ON miembros FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() IN ('coordinator', 'field_worker')
        AND public.is_within_scope_via_sector(sector_id)
        AND (
          public.get_my_movimiento_id() IS NULL
          OR movimiento_id = public.get_my_movimiento_id()
        )
      )
    )
  );

-- UPDATE: admin and coordinator/field_worker within their scope and movimiento
CREATE POLICY "miembros_update_v2"
  ON miembros FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() IN ('coordinator', 'field_worker')
        AND public.is_within_scope_via_sector(sector_id)
        AND (
          public.get_my_movimiento_id() IS NULL
          OR movimiento_id = public.get_my_movimiento_id()
        )
      )
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() IN ('coordinator', 'field_worker')
        AND public.is_within_scope_via_sector(sector_id)
        AND (
          public.get_my_movimiento_id() IS NULL
          OR movimiento_id = public.get_my_movimiento_id()
        )
      )
    )
  );

-- DELETE: admin and coordinator/field_worker within their scope and movimiento
CREATE POLICY "miembros_delete_v2"
  ON miembros FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'coordinator', 'field_worker')
    AND (
      public.get_my_role() = 'admin'
      OR (
        public.get_my_role() IN ('coordinator', 'field_worker')
        AND public.is_within_scope_via_sector(sector_id)
        AND (
          public.get_my_movimiento_id() IS NULL
          OR movimiento_id = public.get_my_movimiento_id()
        )
      )
    )
  );


-- ---------------------------------------------------------------------------
-- C.3: Update usuarios RLS policies to add supervisor and scoped admin
-- ---------------------------------------------------------------------------
-- supervisor gets SELECT on users within their movimiento
-- scoped admin (movimiento_id IS NOT NULL) can manage users only within
--   their movimiento

-- Supervisor SELECT: can see other users in the same movimiento
CREATE POLICY "usuarios_select_supervisor"
  ON usuarios FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'supervisor'
    AND public.get_my_movimiento_id() IS NOT NULL
    AND movimiento_id = public.get_my_movimiento_id()
  );

-- Scoped admin INSERT: can create users in their movimiento only
CREATE POLICY "usuarios_insert_scoped_admin"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
    AND public.get_my_movimiento_id() IS NOT NULL
    AND movimiento_id = public.get_my_movimiento_id()
  );

-- Scoped admin UPDATE: can modify users in their movimiento only
CREATE POLICY "usuarios_update_scoped_admin"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
    AND public.get_my_movimiento_id() IS NOT NULL
    AND movimiento_id = public.get_my_movimiento_id()
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
    AND public.get_my_movimiento_id() IS NOT NULL
    AND movimiento_id = public.get_my_movimiento_id()
  );

-- Scoped admin DELETE: can deactivate users in their movimiento only
CREATE POLICY "usuarios_delete_scoped_admin"
  ON usuarios FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'admin'
    AND public.get_my_movimiento_id() IS NOT NULL
    AND movimiento_id = public.get_my_movimiento_id()
  );


-- ---------------------------------------------------------------------------
-- C.4: check_cedula_duplicado RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_cedula_duplicado(p_cedula TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_in_own_tenant BOOLEAN;
  v_in_other_tenant BOOLEAN;
  v_my_tenant UUID := public.get_my_tenant_id();
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM miembros WHERE cedula = p_cedula AND tenant_id = v_my_tenant
  ) INTO v_in_own_tenant;

  SELECT EXISTS(
    SELECT 1 FROM miembros WHERE cedula = p_cedula AND tenant_id <> v_my_tenant
  ) INTO v_in_other_tenant;

  RETURN jsonb_build_object(
    'exists_in_own_org', v_in_own_tenant,
    'exists_in_other_org', v_in_other_tenant
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_cedula_duplicado(TEXT) TO authenticated;
