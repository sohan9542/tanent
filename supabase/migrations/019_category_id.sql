-- Migration 019: Add category_id (Capmo ticket category) to pre_tickets and tickets

-- pre_tickets: store Capmo ticket category ID
ALTER TABLE pre_tickets
  ADD COLUMN IF NOT EXISTS category_id TEXT NULL;

COMMENT ON COLUMN pre_tickets.category_id IS 'Capmo ticket category ID from /projects/{projectId}/ticket-categories';

-- tickets: store Capmo ticket category ID (copied from pre_ticket on finalize)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS category_id TEXT NULL;

COMMENT ON COLUMN tickets.category_id IS 'Capmo ticket category ID from /projects/{projectId}/ticket-categories';

CREATE INDEX IF NOT EXISTS idx_pre_tickets_category_id ON pre_tickets (category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets (category_id);
