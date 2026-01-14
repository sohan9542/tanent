# Why There Are Both `/admin` and `/platform` Routes

## TL;DR

- **`/platform/*`** = NEW system for platform admins/staff (use this!)
- **`/admin/*`** = LEGACY code kept for backward compatibility (will be removed)

---

## Current Situation

### `/platform/*` Routes (NEW - Use This!)
- `/platform/login` - Platform admin/staff login
- `/platform/organizations` - Manage organizations
- `/platform/objects` - Manage objects
- `/platform/users` - Manage platform users
- Uses Supabase Auth
- Uses `platform_users` table with roles

### `/admin/*` Routes (LEGACY - Being Phased Out)
- `/admin/login` - Redirects to `/platform/login`
- `/admin/tickets` - Ticket management (still works, uses new auth)
- `/admin/tenants` - Tenant management (still works)
- Uses new authentication system but old route structure
- Kept for backward compatibility

---

## Why Both Exist?

1. **Migration Period**: We migrated from old admin system to new platform system
2. **Backward Compatibility**: Old bookmarks/links still work
3. **Gradual Migration**: Some pages still use `/admin` routes but with new auth

---

## What Should You Use?

### ✅ Use `/platform/*` for:
- Platform admin login
- Managing organizations, objects, users
- All new development

### ⚠️ `/admin/*` is OK for:
- Ticket viewing (still works)
- Tenant management (still works)
- But will eventually be removed

---

## Future Plan

Eventually, all `/admin/*` routes will be:
1. Removed entirely, OR
2. Redirected to `/platform/*` equivalents

For now, both work, but `/platform/*` is the preferred path.

---

## Quick Reference

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/admin/login` | `/platform/login` | ✅ Redirects |
| `/admin/tickets` | `/platform/tickets` (future) | ⚠️ Still works |
| `/admin/tenants` | `/platform/tenants` (future) | ⚠️ Still works |
