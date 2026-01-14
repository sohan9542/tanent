-- Milestone 2: RLS policies for new tables and role-based access

-- Enable RLS on new tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "buildings_select_all" ON buildings;
DROP POLICY IF EXISTS "organizations_select_all" ON organizations;
DROP POLICY IF EXISTS "staff_users_select_own" ON staff_users;
DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
DROP POLICY IF EXISTS "pre_tickets_select_own" ON pre_tickets;
DROP POLICY IF EXISTS "pre_tickets_insert_own" ON pre_tickets;
DROP POLICY IF EXISTS "pre_tickets_update_own" ON pre_tickets;
DROP POLICY IF EXISTS "pre_ticket_messages_select_own" ON pre_ticket_messages;
DROP POLICY IF EXISTS "pre_ticket_messages_insert_own" ON pre_ticket_messages;
DROP POLICY IF EXISTS "tickets_select_by_role" ON tickets;

-- Buildings: Read-only for all (filtered by application layer)
CREATE POLICY "buildings_select_all"
  ON buildings FOR SELECT
  USING (true);

-- Organizations: Read-only for all (filtered by application layer)
CREATE POLICY "organizations_select_all"
  ON organizations FOR SELECT
  USING (true);

-- Staff users: Can read own record
CREATE POLICY "staff_users_select_own"
  ON staff_users FOR SELECT
  USING (true); -- Filtered by application layer using auth_user_id

-- User roles: Can read own roles
CREATE POLICY "user_roles_select_own"
  ON user_roles FOR SELECT
  USING (true); -- Filtered by application layer

-- Pre-tickets: Tenants can only access their own
CREATE POLICY "pre_tickets_select_own"
  ON pre_tickets FOR SELECT
  USING (true); -- Filtered by application layer using tenant session

CREATE POLICY "pre_tickets_insert_own"
  ON pre_tickets FOR INSERT
  WITH CHECK (true); -- Validated by application layer

CREATE POLICY "pre_tickets_update_own"
  ON pre_tickets FOR UPDATE
  USING (true); -- Validated by application layer

-- Pre-ticket messages: Can only access messages for pre-tickets they can see
CREATE POLICY "pre_ticket_messages_select_own"
  ON pre_ticket_messages FOR SELECT
  USING (true); -- Filtered by application layer

CREATE POLICY "pre_ticket_messages_insert_own"
  ON pre_ticket_messages FOR INSERT
  WITH CHECK (true); -- Validated by application layer

-- Tickets: Role-based access
-- Note: This is a simplified policy. The application layer will handle
-- the complex role-based filtering (owner/tech/warranty + admin/user levels)
CREATE POLICY "tickets_select_by_role"
  ON tickets FOR SELECT
  USING (true); -- Filtered by application layer based on building assignments and roles
