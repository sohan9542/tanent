-- Milestone 2: Correct Object-Based Role System Migration
-- This migration refactors the role system to be object-based and organization-scoped

-- ============================================================================
-- STEP 1: CREATE NEW TABLES
-- ============================================================================

-- Platform users table (all staff users - platform and organization)
CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL, -- Supabase Auth user ID
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK (role IN ('platform_admin', 'platform_staff')) DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table (NO type field - organizations don't have fixed types)
-- Create as organizations_new first, then rename after dropping old one
CREATE TABLE IF NOT EXISTS organizations_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Copy data from old organizations (without type field)
INSERT INTO organizations_new (id, name, created_at, updated_at)
SELECT id, name, created_at, updated_at
FROM organizations
ON CONFLICT (id) DO NOTHING;

-- Organization memberships (many-to-many: users can belong to multiple orgs)
-- Note: Using organizations_new during migration
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations_new(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('org_admin', 'org_staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Objects table (renamed from buildings, no org_id columns)
CREATE TABLE IF NOT EXISTS objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Object assignments (separate table for org assignments to objects)
-- Note: Using organizations_new during migration
CREATE TABLE IF NOT EXISTS object_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  owner_org_id UUID REFERENCES organizations_new(id) ON DELETE SET NULL,
  tech_org_id UUID REFERENCES organizations_new(id) ON DELETE SET NULL,
  warranty_org_id UUID REFERENCES organizations_new(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Object roles (users have roles on specific objects)
-- Note: Using organizations_new during migration
CREATE TABLE IF NOT EXISTS object_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations_new(id) ON DELETE CASCADE,
  role_type VARCHAR(50) NOT NULL CHECK (role_type IN ('owner', 'technical', 'warranty')),
  category_scope VARCHAR(50), -- Optional: for warranty category filtering (e.g., 'plumbing', 'electrical')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, object_id, organization_id, role_type)
);

-- ============================================================================
-- STEP 2: MIGRATE EXISTING DATA
-- ============================================================================

-- Organizations already copied above

-- Migrate buildings → objects
INSERT INTO objects (id, name, address, created_at, updated_at)
SELECT id, name, address, created_at, updated_at
FROM buildings
ON CONFLICT (id) DO NOTHING;

-- Create object_assignments from buildings table
INSERT INTO object_assignments (object_id, owner_org_id, tech_org_id, warranty_org_id, created_at, updated_at)
SELECT 
  id,
  owner_org_id,
  tech_org_id,
  warranty_org_id,
  created_at,
  updated_at
FROM buildings
WHERE owner_org_id IS NOT NULL OR tech_org_id IS NOT NULL OR warranty_org_id IS NOT NULL
ON CONFLICT (object_id) DO NOTHING;

-- Migrate staff_users → platform_users
INSERT INTO platform_users (id, auth_user_id, email, name, is_active, created_at, updated_at)
SELECT 
  id,
  auth_user_id,
  email,
  name,
  is_active,
  created_at,
  updated_at
FROM staff_users
ON CONFLICT (id) DO NOTHING;

-- Create organization_memberships from staff_users
INSERT INTO organization_memberships (user_id, organization_id, role, created_at)
SELECT 
  id as user_id,
  organization_id,
  'org_staff' as role, -- Default to org_staff, can be updated later
  created_at
FROM staff_users
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Migrate user_roles → object_roles (complex mapping)
-- This creates object_roles for all objects where the user's org is assigned
INSERT INTO object_roles (user_id, object_id, organization_id, role_type, created_at)
SELECT DISTINCT
  ur.staff_user_id as user_id,
  oa.object_id,
  su.organization_id as organization_id,
  CASE 
    WHEN ur.role LIKE 'owner%' THEN 'owner'
    WHEN ur.role LIKE 'tech%' THEN 'technical'
    WHEN ur.role LIKE 'warranty%' THEN 'warranty'
  END as role_type,
  ur.created_at
FROM user_roles ur
JOIN staff_users su ON ur.staff_user_id = su.id
JOIN object_assignments oa ON (
  (ur.role LIKE 'owner%' AND oa.owner_org_id = su.organization_id) OR
  (ur.role LIKE 'tech%' AND oa.tech_org_id = su.organization_id) OR
  (ur.role LIKE 'warranty%' AND oa.warranty_org_id = su.organization_id)
)
WHERE su.organization_id IS NOT NULL
ON CONFLICT (user_id, object_id, organization_id, role_type) DO NOTHING;

-- ============================================================================
-- STEP 3: UPDATE EXISTING TABLES
-- ============================================================================

-- Add object_id to tickets (keep building_id temporarily for migration)
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS object_id UUID REFERENCES objects(id) ON DELETE SET NULL;

-- Copy building_id to object_id in tickets
UPDATE tickets 
SET object_id = building_id 
WHERE building_id IS NOT NULL AND object_id IS NULL;

-- Add object_id to pre_tickets
ALTER TABLE pre_tickets 
  ADD COLUMN IF NOT EXISTS object_id UUID REFERENCES objects(id) ON DELETE SET NULL;

-- Copy building_id to object_id in pre_tickets
UPDATE pre_tickets 
SET object_id = building_id 
WHERE building_id IS NOT NULL AND object_id IS NULL;

-- Add object_id to tenants (already has building_id from migration 004)
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS object_id UUID REFERENCES objects(id) ON DELETE SET NULL;

-- Copy building_id to object_id in tenants
UPDATE tenants 
SET object_id = building_id 
WHERE building_id IS NOT NULL AND object_id IS NULL;

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_platform_users_auth_id ON platform_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON platform_users(role);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_object_assignments_object ON object_assignments(object_id);
CREATE INDEX IF NOT EXISTS idx_object_assignments_owner_org ON object_assignments(owner_org_id);
CREATE INDEX IF NOT EXISTS idx_object_assignments_tech_org ON object_assignments(tech_org_id);
CREATE INDEX IF NOT EXISTS idx_object_assignments_warranty_org ON object_assignments(warranty_org_id);
CREATE INDEX IF NOT EXISTS idx_object_roles_user ON object_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_object_roles_object ON object_roles(object_id);
CREATE INDEX IF NOT EXISTS idx_object_roles_org ON object_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_object_roles_role_type ON object_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_tickets_object ON tickets(object_id);
CREATE INDEX IF NOT EXISTS idx_pre_tickets_object ON pre_tickets(object_id);
CREATE INDEX IF NOT EXISTS idx_tenants_object ON tenants(object_id);

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_platform_users_updated_at ON platform_users;
CREATE TRIGGER update_platform_users_updated_at BEFORE UPDATE ON platform_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_new_updated_at ON organizations_new;
CREATE TRIGGER update_organizations_new_updated_at BEFORE UPDATE ON organizations_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_object_assignments_updated_at ON object_assignments;
CREATE TRIGGER update_object_assignments_updated_at BEFORE UPDATE ON object_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_object_roles_updated_at ON object_roles;
CREATE TRIGGER update_object_roles_updated_at BEFORE UPDATE ON object_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_objects_updated_at ON objects;
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: VALIDATION FUNCTION
-- ============================================================================

-- Function to validate object_role matches object_assignment
CREATE OR REPLACE FUNCTION validate_object_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if organization_id in object_role matches the assignment for that role_type
  IF NOT EXISTS (
    SELECT 1 FROM object_assignments oa
    WHERE oa.object_id = NEW.object_id
    AND (
      (NEW.role_type = 'owner' AND oa.owner_org_id = NEW.organization_id) OR
      (NEW.role_type = 'technical' AND oa.tech_org_id = NEW.organization_id) OR
      (NEW.role_type = 'warranty' AND oa.warranty_org_id = NEW.organization_id)
    )
  ) THEN
    RAISE EXCEPTION 'Organization % is not assigned as % for object %', 
      NEW.organization_id, NEW.role_type, NEW.object_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_object_role_trigger
  BEFORE INSERT OR UPDATE ON object_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_object_role();

-- ============================================================================
-- NOTE: OLD TABLES WILL BE DROPPED IN STEP 7 (after code migration)
-- ============================================================================
-- For now, keep old tables for backward compatibility during migration
-- Drop them after all code is updated:
--   DROP TABLE IF EXISTS user_roles;
--   DROP TABLE IF EXISTS staff_users;
--   DROP TABLE IF EXISTS buildings;
--   DROP TABLE IF EXISTS organizations; -- After renaming organizations_new
