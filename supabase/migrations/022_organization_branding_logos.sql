-- Migration 022: Organization-Specific Branding Logos
-- Update branding_logos to be organization-specific

-- Drop the unique constraint on logo_type (we'll have multiple per organization)
ALTER TABLE branding_logos
  DROP CONSTRAINT IF EXISTS branding_logos_logo_type_key;

-- Add organization_id column
ALTER TABLE branding_logos
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add deleted_at column for soft deletes (optional)
ALTER TABLE branding_logos
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Create new unique constraint: one logo per type per organization (excluding deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_branding_logos_org_type 
  ON branding_logos (organization_id, logo_type) 
  WHERE deleted_at IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branding_logos_organization_id 
  ON branding_logos (organization_id);

-- Update existing logos to have NULL organization_id (global/platform logos)
-- These can be used as defaults or removed if not needed

-- For platform admins, they can manage logos for any organization
-- For organization users, they only see/manage their own organization's logos
