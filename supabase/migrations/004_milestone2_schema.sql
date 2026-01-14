-- Milestone 2: Enhanced ticket system with pre-tickets, images, AI, and role-based access

-- Buildings/Objects table (for linking tenants and tickets to physical locations)
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  owner_org_id UUID, -- Will reference organizations table
  tech_org_id UUID,  -- Will reference organizations table
  warranty_org_id UUID, -- Will reference organizations table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table (for owner/tech/warranty organizations)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('owner', 'technical', 'warranty')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff users table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL, -- Supabase Auth user ID
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (many-to-many: staff_users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner_admin', 'owner_user', 'tech_admin', 'tech_user', 'warranty_admin', 'warranty_user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_user_id, role)
);

-- Pre-tickets table (before finalization)
CREATE TABLE IF NOT EXISTS pre_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL, -- plumbing, electrical, heating, other
  location_details TEXT, -- unit/apartment area
  description TEXT NOT NULL,
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, in_review, finalized
  images JSONB DEFAULT '[]'::jsonb, -- Array of {url, filename, size, uploaded_at}
  ai_followups JSONB DEFAULT '[]'::jsonb, -- Array of question strings
  ai_answers JSONB DEFAULT '{}'::jsonb, -- Object mapping question -> answer
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-ticket messages table (thread for clarification)
CREATE TABLE IF NOT EXISTS pre_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_ticket_id UUID NOT NULL REFERENCES pre_tickets(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of {url, filename, size}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_tenant BOOLEAN DEFAULT true -- true if tenant, false if staff
);

-- Update tickets table with new fields for Milestone 2
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS location_details TEXT,
  ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_followups JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_answers JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pre_ticket_id UUID REFERENCES pre_tickets(id) ON DELETE SET NULL;

-- Update status to use 'NEW' or 'OPEN' as default
ALTER TABLE tickets 
  ALTER COLUMN status SET DEFAULT 'NEW';

-- Update tenants table to link to building
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES buildings(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_buildings_owner_org ON buildings(owner_org_id);
CREATE INDEX IF NOT EXISTS idx_buildings_tech_org ON buildings(tech_org_id);
CREATE INDEX IF NOT EXISTS idx_buildings_warranty_org ON buildings(warranty_org_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_auth_id ON staff_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_org ON staff_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_staff_user ON user_roles(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_pre_tickets_tenant ON pre_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pre_tickets_building ON pre_tickets(building_id);
CREATE INDEX IF NOT EXISTS idx_pre_tickets_status ON pre_tickets(status);
CREATE INDEX IF NOT EXISTS idx_pre_ticket_messages_pre_ticket ON pre_ticket_messages(pre_ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_building ON tickets(building_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_urgency ON tickets(urgency);
CREATE INDEX IF NOT EXISTS idx_tenants_building ON tenants(building_id);

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_users_updated_at ON staff_users;
CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pre_tickets_updated_at ON pre_tickets;
CREATE TRIGGER update_pre_tickets_updated_at BEFORE UPDATE ON pre_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
