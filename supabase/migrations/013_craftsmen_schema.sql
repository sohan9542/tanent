-- Migration 013: Craftsmen Management Schema
-- Phase: Data Management Only (no login/auth for craftsmen)

-- ============================================================================
-- STEP 1: CREATE CRAFTSMEN TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS craftsmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  trade TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: CREATE OBJECT_CRAFTSMEN TABLE (junction table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS object_craftsmen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  craftsman_id UUID NOT NULL REFERENCES craftsmen(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(object_id, craftsman_id)
);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_craftsmen_organization ON craftsmen(organization_id);
CREATE INDEX IF NOT EXISTS idx_craftsmen_trade ON craftsmen(trade);
CREATE INDEX IF NOT EXISTS idx_craftsmen_is_active ON craftsmen(is_active);
CREATE INDEX IF NOT EXISTS idx_object_craftsmen_object ON object_craftsmen(object_id);
CREATE INDEX IF NOT EXISTS idx_object_craftsmen_craftsman ON object_craftsmen(craftsman_id);

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

-- Updated_at trigger for craftsmen
DROP TRIGGER IF EXISTS update_craftsmen_updated_at ON craftsmen;
CREATE TRIGGER update_craftsmen_updated_at 
  BEFORE UPDATE ON craftsmen
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: VALIDATION TRIGGER FOR OBJECT_CRAFTSMEN
-- ============================================================================

-- Ensure craftsman's organization is assigned as TECHNICAL to the object
CREATE OR REPLACE FUNCTION validate_object_craftsman_assignment()
RETURNS TRIGGER AS $$
DECLARE
  craftsman_org_id UUID;
  is_tech_org BOOLEAN;
BEGIN
  -- Get the craftsman's organization
  SELECT organization_id INTO craftsman_org_id
  FROM craftsmen
  WHERE id = NEW.craftsman_id;
  
  IF craftsman_org_id IS NULL THEN
    RAISE EXCEPTION 'Craftsman not found';
  END IF;
  
  -- Check if the craftsman's organization is assigned as TECHNICAL to this object
  SELECT EXISTS (
    SELECT 1 FROM object_assignments
    WHERE object_id = NEW.object_id
    AND tech_org_id = craftsman_org_id
  ) INTO is_tech_org;
  
  IF NOT is_tech_org THEN
    RAISE EXCEPTION 'Craftsman organization (%) is not assigned as TECHNICAL for object (%)', 
      craftsman_org_id, NEW.object_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_object_craftsman_trigger ON object_craftsmen;
CREATE TRIGGER validate_object_craftsman_trigger
  BEFORE INSERT OR UPDATE ON object_craftsmen
  FOR EACH ROW
  EXECUTE FUNCTION validate_object_craftsman_assignment();

-- ============================================================================
-- STEP 6: CLEANUP TRIGGER
-- ============================================================================

-- Auto-remove object_craftsmen when organization is removed from object's tech assignment
CREATE OR REPLACE FUNCTION cleanup_object_craftsmen_on_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When tech_org_id is changed or removed
  IF OLD.tech_org_id IS DISTINCT FROM NEW.tech_org_id THEN
    -- Remove craftsmen assignments from the old tech org
    IF OLD.tech_org_id IS NOT NULL THEN
      DELETE FROM object_craftsmen oc
      USING craftsmen c
      WHERE oc.object_id = OLD.object_id
      AND oc.craftsman_id = c.id
      AND c.organization_id = OLD.tech_org_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_object_craftsmen_on_assignment_change ON object_assignments;
CREATE TRIGGER cleanup_object_craftsmen_on_assignment_change
  AFTER UPDATE ON object_assignments
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_object_craftsmen_on_assignment_change();

-- ============================================================================
-- NOTES
-- ============================================================================
-- - Craftsmen belong to a TECHNICAL organization
-- - Craftsmen can only be assigned to objects where their org is the tech_org
-- - When an organization loses tech_org status on an object, all its craftsmen
--   are automatically unassigned from that object
-- - This migration creates DATA MANAGEMENT only - no auth/login for craftsmen
