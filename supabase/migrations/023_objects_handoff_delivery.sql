-- Migration 023: Per-object ticket handoff delivery (email vs Capmo)

ALTER TABLE objects
  ADD COLUMN IF NOT EXISTS handoff_delivery TEXT NOT NULL DEFAULT 'email'
  CHECK (handoff_delivery IN ('email', 'capmo'));

COMMENT ON COLUMN objects.handoff_delivery IS 'Ticket handoff method: email = send via email to warranty manager when passing to warranty; capmo = send to Capmo when passing to technical.';
