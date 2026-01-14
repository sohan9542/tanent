# Tables to Delete After Migration

## ⚠️ IMPORTANT: Verify Before Deleting

**Before deleting any tables, ensure:**
1. ✅ Migration 006 has been run successfully
2. ✅ Migration 007 has been run successfully  
3. ✅ Migration 008 has been run successfully
4. ✅ All data has been migrated to new tables
5. ✅ Application is working correctly with new tables
6. ✅ You have a database backup

---

## 🗑️ Tables to Delete

### 1. **`buildings`** ❌ DELETE
**Why:**
- Replaced by `objects` table
- All data migrated to `objects` in migration 006
- `buildings` had direct org_id columns (owner_org_id, tech_org_id, warranty_org_id)
- New system uses separate `object_assignments` table for better flexibility
- Foreign keys from `tickets`, `pre_tickets`, `tenants` now point to `objects` (via `object_id`)

**Verification:**
```sql
-- Check if any data still references buildings
SELECT COUNT(*) FROM tickets WHERE building_id IS NOT NULL AND object_id IS NULL;
SELECT COUNT(*) FROM pre_tickets WHERE building_id IS NOT NULL AND object_id IS NULL;
SELECT COUNT(*) FROM tenants WHERE building_id IS NOT NULL AND object_id IS NULL;
-- If all return 0, safe to delete
```

**Delete Command:**
```sql
DROP TABLE IF EXISTS buildings CASCADE;
```

---

### 2. **`staff_users`** ❌ DELETE
**Why:**
- Replaced by `platform_users` table
- All data migrated to `platform_users` in migration 006
- Organization memberships now handled by `organization_memberships` table (many-to-many)
- Old system had single `organization_id` column
- New system allows users to belong to multiple organizations

**Verification:**
```sql
-- Check if all staff_users were migrated
SELECT COUNT(*) FROM staff_users;
SELECT COUNT(*) FROM platform_users WHERE role IS NULL; -- Org users
SELECT COUNT(*) FROM organization_memberships;
-- Compare counts to ensure all migrated
```

**Delete Command:**
```sql
DROP TABLE IF EXISTS staff_users CASCADE;
```

---

### 3. **`user_roles`** ❌ DELETE
**Why:**
- Replaced by `object_roles` table
- Old system had global roles (owner_admin, owner_user, tech_admin, etc.)
- New system has object-scoped roles (owner, technical, warranty per object)
- All data migrated to `object_roles` in migration 006

**Verification:**
```sql
-- Check if all roles were migrated
SELECT COUNT(*) FROM user_roles;
SELECT COUNT(*) FROM object_roles;
-- Compare counts (may not match exactly due to different structure)
```

**Delete Command:**
```sql
DROP TABLE IF EXISTS user_roles CASCADE;
```

---

### 4. **`organizations_old`** ❌ DELETE
**Why:**
- Backup of old `organizations` table created during migration 008
- Old table had `type` field (owner/technical/warranty)
- New `organizations` table (renamed from `organizations_new`) has no type field
- Organizations don't have fixed types anymore (same org can be owner for Object A and tech for Object B)

**Verification:**
```sql
-- Check if organizations table exists and has data
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM organizations_old;
-- Ensure new table has all data
```

**Delete Command:**
```sql
DROP TABLE IF EXISTS organizations_old CASCADE;
```

---

### 5. **`admins`** ❌ DELETE
**Why:**
- Legacy admin authentication system
- Replaced by `platform_users` with `role='platform_admin'` or `role='platform_staff'`
- Old system used separate `admins` table with password hashes
- New system uses Supabase Auth with `platform_users` linking to auth users

**Verification:**
```sql
-- Check if any platform admins exist
SELECT COUNT(*) FROM platform_users WHERE role IN ('platform_admin', 'platform_staff');
SELECT COUNT(*) FROM admins;
-- Ensure platform_users has admin users before deleting admins
```

**Delete Command:**
```sql
DROP TABLE IF EXISTS admins CASCADE;
```

---

### 6. **`admin_sessions`** ❌ DELETE
**Why:**
- Tied to `admins` table (foreign key: `admin_id`)
- Legacy session management for old admin system
- New system uses Supabase Auth sessions (no separate session table needed)
- Will become invalid when `admins` table is deleted anyway

**Verification:**
```sql
-- Check if any active sessions exist
SELECT COUNT(*) FROM admin_sessions WHERE expires_at > NOW();
-- Should be 0 if migration is complete
```

**Delete Command:**
```sql
DROP TABLE IF EXISTS admin_sessions CASCADE;
```

---

### 7. **`organizations_view`** ⚠️ DROP VIEW (Optional)
**Why:**
- Created in migration 008 for backward compatibility
- View that selects from `organizations` table
- Not needed if all code has been updated to use `organizations` directly
- Can be kept if you want the view, but not necessary

**Verification:**
```sql
-- Check if view exists
SELECT * FROM information_schema.views WHERE table_name = 'organizations_view';
```

**Delete Command:**
```sql
DROP VIEW IF EXISTS organizations_view;
```

---

## 📋 Complete Cleanup Script

Run this script **ONLY AFTER** verifying everything works:

```sql
-- Step 1: Drop view (optional)
DROP VIEW IF EXISTS organizations_view;

-- Step 2: Drop old tables
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS staff_users CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS organizations_old CASCADE;

-- Step 3: Verify deletions
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('buildings', 'staff_users', 'user_roles', 'organizations_old', 'admins', 'admin_sessions');
-- Should return 0 rows
```

---

## ✅ Tables to KEEP

These tables are part of the new system and should **NOT** be deleted:

- ✅ `platform_users` - All staff users (platform + organization)
- ✅ `organizations` - Organizations (renamed from organizations_new)
- ✅ `organization_memberships` - User-organization relationships
- ✅ `objects` - Buildings/objects (replaces buildings)
- ✅ `object_assignments` - Organization assignments to objects
- ✅ `object_roles` - User roles on specific objects
- ✅ `tenants` - Tenant data
- ✅ `tickets` - Ticket data
- ✅ `pre_tickets` - Pre-ticket data
- ✅ `pre_ticket_messages` - Pre-ticket messages
- ✅ `tenant_sessions` - Tenant session management

---

## 🔍 Final Verification Checklist

Before running the cleanup script:

- [ ] All migrations (006, 007, 008) have been run successfully
- [ ] Application is working correctly with new tables
- [ ] No errors in application logs
- [ ] All data appears correctly in UI
- [ ] Platform admin can manage organizations/objects/users
- [ ] Organization admin can manage users and assign roles
- [ ] Tickets are visible based on object roles
- [ ] Database backup has been created
- [ ] Verification queries above return expected results

---

## 🚨 Rollback Plan

If something goes wrong after deletion:

1. Restore from database backup
2. Or re-run migrations 001-005 to recreate old tables (data will be lost)
3. Re-run migration 006 to migrate data again
