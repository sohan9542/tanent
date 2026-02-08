-- Migration 014: Craftsmen RLS Policies
-- Implements row-level security for craftsmen management

-- ============================================================================
-- STEP 1: ENABLE RLS
-- ============================================================================

ALTER TABLE craftsmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_craftsmen ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: CRAFTSMEN POLICIES
-- ============================================================================

-- SELECT: Platform admins can see all
DROP POLICY IF EXISTS craftsmen_select_platform_admin ON craftsmen;
CREATE POLICY craftsmen_select_platform_admin ON craftsmen
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.role = 'platform_admin'
      AND pu.is_active = true
    )
  );

-- SELECT: Org users can see craftsmen from their organization
DROP POLICY IF EXISTS craftsmen_select_org_user ON craftsmen;
CREATE POLICY craftsmen_select_org_user ON craftsmen
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      JOIN organization_memberships om ON om.user_id = pu.id
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND om.organization_id = craftsmen.organization_id
    )
  );

-- INSERT: Platform admins can create for any org
DROP POLICY IF EXISTS craftsmen_insert_platform_admin ON craftsmen;
CREATE POLICY craftsmen_insert_platform_admin ON craftsmen
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.role = 'platform_admin'
      AND pu.is_active = true
    )
  );

-- INSERT: Org admins can create craftsmen for their org
-- Only if org is assigned as TECHNICAL on at least one object
DROP POLICY IF EXISTS craftsmen_insert_org_admin ON craftsmen;
CREATE POLICY craftsmen_insert_org_admin ON craftsmen
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      JOIN organization_memberships om ON om.user_id = pu.id
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND om.organization_id = craftsmen.organization_id
      AND om.role = 'org_admin'
      -- Org must be assigned as technical on at least one object
      AND EXISTS (
        SELECT 1 FROM object_assignments oa
        WHERE oa.tech_org_id = om.organization_id
      )
    )
  );

-- UPDATE: Platform admins can update any
DROP POLICY IF EXISTS craftsmen_update_platform_admin ON craftsmen;
CREATE POLICY craftsmen_update_platform_admin ON craftsmen
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.role = 'platform_admin'
      AND pu.is_active = true
    )
  );

-- UPDATE: Org admins can update craftsmen in their org
DROP POLICY IF EXISTS craftsmen_update_org_admin ON craftsmen;
CREATE POLICY craftsmen_update_org_admin ON craftsmen
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      JOIN organization_memberships om ON om.user_id = pu.id
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND om.organization_id = craftsmen.organization_id
      AND om.role = 'org_admin'
    )
  );

-- DELETE: Platform admins can delete any
DROP POLICY IF EXISTS craftsmen_delete_platform_admin ON craftsmen;
CREATE POLICY craftsmen_delete_platform_admin ON craftsmen
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.role = 'platform_admin'
      AND pu.is_active = true
    )
  );

-- DELETE: Org admins can delete craftsmen in their org
DROP POLICY IF EXISTS craftsmen_delete_org_admin ON craftsmen;
CREATE POLICY craftsmen_delete_org_admin ON craftsmen
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      JOIN organization_memberships om ON om.user_id = pu.id
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND om.organization_id = craftsmen.organization_id
      AND om.role = 'org_admin'
    )
  );

-- ============================================================================
-- STEP 3: OBJECT_CRAFTSMEN POLICIES
-- ============================================================================

-- SELECT: Platform admins can see all
DROP POLICY IF EXISTS object_craftsmen_select_platform_admin ON object_craftsmen;
CREATE POLICY object_craftsmen_select_platform_admin ON object_craftsmen
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.role = 'platform_admin'
      AND pu.is_active = true
    )
  );

-- SELECT: Org users can see assignments for objects they can access
DROP POLICY IF EXISTS object_craftsmen_select_org_user ON object_craftsmen;
CREATE POLICY object_craftsmen_select_org_user ON object_craftsmen
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      JOIN organization_memberships om ON om.user_id = pu.id
      JOIN object_assignments oa ON (
        oa.owner_org_id = om.organization_id OR
        oa.tech_org_id = om.organization_id OR
        oa.warranty_org_id = om.organization_id
      )
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND oa.object_id = object_craftsmen.object_id
    )
  );

-- INSERT: Platform admins can create any assignment
DROP POLICY IF EXISTS object_craftsmen_insert_platform_admin ON object_craftsmen;
CREATE POLICY object_craftsmen_insert_platform_admin ON object_craftsmen
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.role = 'platform_admin'
      AND pu.is_active = true
    )
  );

-- INSERT: Org admins can create assignments if they are tech manager for that object
DROP POLICY IF EXISTS object_craftsmen_insert_org_admin ON object_craftsmen;
CREATE POLICY object_craftsmen_insert_org_admin ON object_craftsmen
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      JOIN organization_memberships om ON om.user_id = pu.id
      JOIN object_assignments oa ON oa.tech_org_id = om.organization_id
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND oa.object_id = object_craftsmen.object_id
      AND om.role = 'org_admin'
    )
  );

-- DELETE: Platform admins can delete any assignment
DROP POLICY IF EXISTS object_craftsmen_delete_platform_admin ON object_craftsmen;
CREATE POLICY object_craftsmen_delete_platform_admin ON object_craftsmen
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.role = 'platform_admin'
      AND pu.is_active = true
    )
  );

-- DELETE: Org admins can delete assignments if they are tech manager for that object
DROP POLICY IF EXISTS object_craftsmen_delete_org_admin ON object_craftsmen;
CREATE POLICY object_craftsmen_delete_org_admin ON object_craftsmen
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      JOIN organization_memberships om ON om.user_id = pu.id
      JOIN object_assignments oa ON oa.tech_org_id = om.organization_id
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND oa.object_id = object_craftsmen.object_id
      AND om.role = 'org_admin'
    )
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- - Platform admins have full access to all craftsmen and assignments
-- - Organization users can only see craftsmen from their own organization
-- - Only org admins can manage (insert/update/delete) craftsmen
-- - Craftsmen can only be created for organizations that are TECHNICAL on at least one object
-- - Object assignments can only be created by org admins who are tech managers for that object
-- - The validate_object_craftsman_trigger (from migration 013) ensures assignment validity
