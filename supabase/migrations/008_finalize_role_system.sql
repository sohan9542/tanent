-- Milestone 2: Finalize role system migration
-- Run this AFTER all code is updated to use new table names

-- Step 1: Rename old organizations table
ALTER TABLE IF EXISTS organizations RENAME TO organizations_old;

-- Step 2: Rename organizations_new to organizations
ALTER TABLE organizations_new RENAME TO organizations;

-- Step 3: Update foreign key constraint names to reference new table
-- (PostgreSQL automatically updates FK references when table is renamed)

-- Step 4: Create view for backward compatibility during transition
-- This allows code using 'organizations' to work with new table
CREATE OR REPLACE VIEW organizations_view AS SELECT * FROM organizations;

-- Note: Old tables (user_roles, staff_users, buildings, organizations_old) 
-- should be dropped manually after verifying all code works:
--   DROP TABLE IF EXISTS user_roles CASCADE;
--   DROP TABLE IF EXISTS staff_users CASCADE;
--   DROP TABLE IF EXISTS buildings CASCADE;
--   DROP TABLE IF EXISTS organizations_old CASCADE;
