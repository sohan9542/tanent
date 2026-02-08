-- Migration 016: Capmo integration RLS updates

-- ============================================================================
-- EMAIL EVENTS: Lock down (service role only)
-- ============================================================================

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OBJECTS: Restrict updates to platform admins/staff
-- ============================================================================

DROP POLICY IF EXISTS objects_update_platform_staff ON objects;
CREATE POLICY objects_update_platform_staff ON objects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND pu.role IN ('platform_admin', 'platform_staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND pu.role IN ('platform_admin', 'platform_staff')
    )
  );

-- ============================================================================
-- TICKETS: Restrict Capmo field updates to platform admins/staff
-- ============================================================================

DROP POLICY IF EXISTS tickets_update_platform_staff ON tickets;
CREATE POLICY tickets_update_platform_staff ON tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND pu.role IN ('platform_admin', 'platform_staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.auth_user_id = auth.uid()
      AND pu.is_active = true
      AND pu.role IN ('platform_admin', 'platform_staff')
    )
  );
