-- =============================================================================
-- Migration: JWT Custom Claims Hook
-- Description: Creates a Postgres function that injects PEMOS user role and
--              geographic scope into the JWT access token claims. This function
--              is registered as a Supabase Auth hook (custom_access_token).
--
-- IMPORTANT: After applying this migration, you must register the hook in
--            Supabase Dashboard > Authentication > Hooks > Custom Access Token.
--            Set the hook to call `public.custom_access_token_hook`.
-- =============================================================================

-- Create JWT custom claims hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
  user_tenant_id UUID;
  user_provincia_id UUID;
  user_municipio_id UUID;
  user_circunscripcion_id UUID;
BEGIN
  -- Look up user in usuarios table
  SELECT role::TEXT, tenant_id, provincia_id, municipio_id, circunscripcion_id
  INTO user_role, user_tenant_id, user_provincia_id, user_municipio_id, user_circunscripcion_id
  FROM public.usuarios
  WHERE auth_user_id = (event->>'user_id')::UUID;

  -- If no user found, return event unchanged
  IF user_role IS NULL THEN
    RETURN event;
  END IF;

  -- Build claims from existing token claims
  claims := event->'claims';

  -- Inject role and tenant_id
  claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id));

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

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant to supabase_auth_admin (required for Auth hooks to invoke this function)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from all other roles -- this function should only be called by Auth
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- Grant read access on usuarios to the auth admin so the hook can look up roles
GRANT SELECT ON TABLE public.usuarios TO supabase_auth_admin;
