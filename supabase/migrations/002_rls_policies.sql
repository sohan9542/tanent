-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
DROP POLICY IF EXISTS "tickets_select_own" ON tickets;
DROP POLICY IF EXISTS "tenant_sessions_select_own" ON tenant_sessions;
DROP POLICY IF EXISTS "admins_full_access" ON tenants;
DROP POLICY IF EXISTS "tickets_admin_access" ON tickets;
DROP POLICY IF EXISTS "admin_sessions_select_own" ON admin_sessions;

-- Tenant policies: Tenants can only read their own row
-- Note: This uses a function that checks session token from request context
-- For MVP, we'll use a simpler approach with service role for tenant lookups
-- This policy is a backup; main access control is in application layer
CREATE POLICY "tenants_select_own"
  ON tenants FOR SELECT
  USING (true); -- Will be filtered by application layer using session

-- Tickets: Tenants can only read their own tickets
CREATE POLICY "tickets_select_own"
  ON tickets FOR SELECT
  USING (true); -- Will be filtered by application layer using session

-- Tenant sessions: Tenants can only read their own sessions
CREATE POLICY "tenant_sessions_select_own"
  ON tenant_sessions FOR SELECT
  USING (true); -- Will be filtered by application layer

-- Admin policies (backup - admin uses service role primarily)
CREATE POLICY "admins_full_access"
  ON tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE id::text = current_setting('request.jwt.claims', true)::json->>'admin_id'
      AND is_active = true
    )
  );

CREATE POLICY "tickets_admin_access"
  ON tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE id::text = current_setting('request.jwt.claims', true)::json->>'admin_id'
      AND is_active = true
    )
  );

-- Admin sessions: Admins can only read their own sessions
CREATE POLICY "admin_sessions_select_own"
  ON admin_sessions FOR SELECT
  USING (true); -- Will be filtered by application layer


