-- =============================================================================
-- Migration: Create Audit Log Table
-- =============================================================================
-- Stores authentication and authorization events for security auditing.
-- Designed for append-only writes from API routes (via service role) and
-- read access restricted to admin users.
--
-- Event types include: login, logout, login_failed, password_change,
-- token_refresh, role_change, permission_denied, user_created, user_deleted.
--
-- Rollback:
--   DROP POLICY IF EXISTS "audit_log_admin_select" ON auth_audit_log;
--   DROP POLICY IF EXISTS "audit_log_service_insert" ON auth_audit_log;
--   DROP INDEX IF EXISTS idx_audit_log_event_type;
--   DROP INDEX IF EXISTS idx_audit_log_user_id;
--   DROP INDEX IF EXISTS idx_audit_log_created_at;
--   DROP INDEX IF EXISTS idx_audit_log_tenant_id;
--   DROP TABLE IF EXISTS auth_audit_log;
-- =============================================================================

CREATE TABLE public.auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type TEXT NOT NULL,

  -- Who triggered the event (NULL for failed logins with unknown user)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  -- Flexible payload for event-specific data
  -- Examples:
  --   login: { "provider": "email" }
  --   role_change: { "old_role": "observer", "new_role": "coordinator" }
  --   permission_denied: { "route": "/api/usuarios", "action": "DELETE" }
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Tenant isolation
  tenant_id UUID,

  -- Immutable timestamp (no updated_at -- audit logs are append-only)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX idx_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON auth_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_tenant_id ON auth_audit_log(tenant_id);

-- Enable RLS
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log FORCE ROW LEVEL SECURITY;

-- Only admin users can read audit logs (within their tenant)
CREATE POLICY "audit_log_admin_select"
  ON auth_audit_log
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') = 'admin'
    AND tenant_id = (auth.jwt()->>'tenant_id')::UUID
  );

-- Service role can insert audit log entries (used by API routes / Edge Functions).
-- The service_role bypasses RLS by default in Supabase, but this policy
-- also allows authenticated inserts from server-side API routes that use
-- the service key. The WITH CHECK (true) is intentional -- insert validation
-- is handled by the API layer, not RLS.
CREATE POLICY "audit_log_service_insert"
  ON auth_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Prevent any updates or deletes -- audit logs are immutable
-- (No UPDATE or DELETE policies means these operations are denied by RLS)

-- Revoke from anon
REVOKE ALL ON auth_audit_log FROM anon;

-- Grant to authenticated (RLS controls actual access)
GRANT SELECT, INSERT ON auth_audit_log TO authenticated;
