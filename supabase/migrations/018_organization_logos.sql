-- Migration 018: Add logo support for organizations

-- Add logo_url field to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;

-- Index for logo_url lookups
CREATE INDEX IF NOT EXISTS idx_organizations_logo_url
  ON organizations (logo_url)
  WHERE logo_url IS NOT NULL;
