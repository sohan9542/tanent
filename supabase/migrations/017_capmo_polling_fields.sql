-- Migration 017: Capmo polling fields for fixed 30-minute polling

-- ============================================================================
-- TICKETS: Add polling scheduling and notification tracking fields
-- ============================================================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS capmo_next_poll_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS capmo_last_notified_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS capmo_last_notified_at TIMESTAMPTZ NULL;

-- Index for efficient polling queries
CREATE INDEX IF NOT EXISTS idx_tickets_capmo_next_poll_at
  ON tickets (capmo_next_poll_at)
  WHERE capmo_ticket_id IS NOT NULL 
    AND capmo_status IS DISTINCT FROM 'CLOSED'
    AND capmo_next_poll_at IS NOT NULL;

-- Composite index for polling query optimization
CREATE INDEX IF NOT EXISTS idx_tickets_capmo_polling
  ON tickets (capmo_next_poll_at, capmo_status, capmo_ticket_id)
  WHERE capmo_ticket_id IS NOT NULL;
