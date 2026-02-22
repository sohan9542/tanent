-- Migration 020: Milestone 4 - Admin Dashboard MVP
-- Adds: ticket activity logs, warranty flag, branding logos, app settings

-- ============================================================================
-- TICKETS: Add warranty flag
-- ============================================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS warranty_flag BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tickets_warranty_flag
  ON tickets (warranty_flag);

-- ============================================================================
-- TICKET ACTIVITY LOGS: Track all admin actions on tickets
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  admin_user_id UUID, -- Can reference platform_users.id or admins.id
  admin_email VARCHAR(255) NOT NULL, -- Store email for audit trail
  action_type VARCHAR(50) NOT NULL, -- status_change, warranty_flag_toggle, handoff_triggered, note_added, etc.
  action_details JSONB DEFAULT '{}'::jsonb, -- Store additional details (old_value, new_value, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_logs_ticket_id
  ON ticket_activity_logs (ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_logs_created_at
  ON ticket_activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_logs_admin_email
  ON ticket_activity_logs (admin_email);

-- ============================================================================
-- BRANDING LOGOS: Store logo URLs for PDF reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS branding_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_type VARCHAR(50) NOT NULL UNIQUE CHECK (logo_type IN ('owner', 'technical_partner', 'warranty_partner')),
  logo_url TEXT NOT NULL,
  uploaded_by UUID, -- admin_user_id or platform_user_id
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default empty entries (can be updated later)
INSERT INTO branding_logos (logo_type, logo_url)
VALUES 
  ('owner', ''),
  ('technical_partner', ''),
  ('warranty_partner', '')
ON CONFLICT (logo_type) DO NOTHING;

-- ============================================================================
-- APP SETTINGS: Store integration settings and email configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID -- admin_user_id or platform_user_id
);

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES 
  ('capmo_enabled', '{"enabled": false}'::jsonb, 'Global toggle to enable/disable Capmo handoff'),
  ('email_handoff_recipients', '{"contractor": "", "warranty_manager": ""}'::jsonb, 'Email addresses for ticket handoff'),
  ('ticket_statuses', '["Open", "In Review", "Closed"]'::jsonb, 'Available ticket status values')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- LOCATIONS: Ensure objects table has soft-delete support
-- ============================================================================

ALTER TABLE objects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_objects_deleted_at
  ON objects (deleted_at)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TRIGGERS: Update updated_at for branding_logos and app_settings
-- ============================================================================

DROP TRIGGER IF EXISTS update_branding_logos_updated_at ON branding_logos;
CREATE TRIGGER update_branding_logos_updated_at BEFORE UPDATE ON branding_logos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
