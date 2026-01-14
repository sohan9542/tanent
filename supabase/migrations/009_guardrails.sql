-- Milestone 2: Guardrails for edge cases
-- Prevents orphaned roles and handles cascading deletions

-- ============================================================================
-- TRIGGER: Auto-remove object_roles when organization is removed from assignment
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_object_roles_on_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When an organization is removed from an assignment, remove related object_roles
  IF TG_OP = 'UPDATE' THEN
    -- If owner_org_id was removed
    IF OLD.owner_org_id IS NOT NULL AND NEW.owner_org_id IS NULL THEN
      DELETE FROM object_roles
      WHERE object_id = NEW.object_id
        AND organization_id = OLD.owner_org_id
        AND role_type = 'owner';
    END IF;

    -- If tech_org_id was removed
    IF OLD.tech_org_id IS NOT NULL AND NEW.tech_org_id IS NULL THEN
      DELETE FROM object_roles
      WHERE object_id = NEW.object_id
        AND organization_id = OLD.tech_org_id
        AND role_type = 'technical';
    END IF;

    -- If warranty_org_id was removed
    IF OLD.warranty_org_id IS NOT NULL AND NEW.warranty_org_id IS NULL THEN
      DELETE FROM object_roles
      WHERE object_id = NEW.object_id
        AND organization_id = OLD.warranty_org_id
        AND role_type = 'warranty';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_object_roles_on_assignment_change ON object_assignments;
CREATE TRIGGER trigger_cleanup_object_roles_on_assignment_change
  AFTER UPDATE ON object_assignments
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_object_roles_on_assignment_change();

-- ============================================================================
-- TRIGGER: Auto-remove object_roles when user is removed from organization
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_object_roles_on_membership_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user is removed from an organization, remove their object_roles for that org
  DELETE FROM object_roles
  WHERE user_id = OLD.user_id
    AND organization_id = OLD.organization_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_object_roles_on_membership_delete ON organization_memberships;
CREATE TRIGGER trigger_cleanup_object_roles_on_membership_delete
  AFTER DELETE ON organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_object_roles_on_membership_delete();

-- ============================================================================
-- FUNCTION: Validate object_role matches assignment (enhanced)
-- ============================================================================

-- This function already exists from migration 006, but we'll ensure it's robust
CREATE OR REPLACE FUNCTION validate_object_role()
RETURNS TRIGGER AS $$
DECLARE
  assignment_record RECORD;
BEGIN
  -- Get the object assignment
  SELECT * INTO assignment_record
  FROM object_assignments
  WHERE object_id = NEW.object_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Object assignment not found for object_id %', NEW.object_id;
  END IF;

  -- Validate role_type matches assignment
  IF NEW.role_type = 'owner' AND assignment_record.owner_org_id != NEW.organization_id THEN
    RAISE EXCEPTION 'Role type "owner" requires organization_id to match owner_org_id in assignment';
  END IF;

  IF NEW.role_type = 'technical' AND assignment_record.tech_org_id != NEW.organization_id THEN
    RAISE EXCEPTION 'Role type "technical" requires organization_id to match tech_org_id in assignment';
  END IF;

  IF NEW.role_type = 'warranty' AND assignment_record.warranty_org_id != NEW.organization_id THEN
    RAISE EXCEPTION 'Role type "warranty" requires organization_id to match warranty_org_id in assignment';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists (may already exist from migration 006)
DROP TRIGGER IF EXISTS validate_object_role_trigger ON object_roles;
CREATE TRIGGER validate_object_role_trigger
  BEFORE INSERT OR UPDATE ON object_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_object_role();
