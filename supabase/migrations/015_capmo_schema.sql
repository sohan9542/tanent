-- Migration 015: Capmo integration schema updates

-- ============================================================================
-- OBJECTS: Capmo project mapping
-- ============================================================================

ALTER TABLE objects
  ADD COLUMN IF NOT EXISTS capmo_project_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS capmo_project_name TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_objects_capmo_project_id
  ON objects (capmo_project_id);

-- ============================================================================
-- TICKETS: Capmo ticket fields
-- ============================================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS capmo_ticket_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS capmo_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS capmo_last_synced_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS capmo_payload JSONB NULL,
  ADD COLUMN IF NOT EXISTS capmo_error TEXT NULL;

-- Unique Capmo ticket id (allow NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_capmo_ticket_id
  ON tickets (capmo_ticket_id)
  WHERE capmo_ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_status_capmo_status
  ON tickets (status, capmo_status);

-- ============================================================================
-- EMAIL EVENTS: Deduplicate outgoing emails
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  sent_to TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_ticket_id
  ON email_events (ticket_id);
