-- Ticket workflow: track current organization turn
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS current_org_role VARCHAR(20) NOT NULL DEFAULT 'technical';

ALTER TABLE tickets
  ADD CONSTRAINT tickets_current_org_role_check
  CHECK (current_org_role IN ('technical', 'warranty', 'owner'));

CREATE INDEX IF NOT EXISTS idx_tickets_current_org_role
  ON public.tickets (current_org_role);
