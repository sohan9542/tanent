# Authentication System - Updated for Role-Based Access

## Overview

The authentication system has been updated to use Supabase Auth with role-based access control. There are now **two separate login systems**:

1. **Platform Admin/Staff** - Full platform management access
2. **Organization Users** - Organization-scoped access

---

## 🔐 Login Pages

### Platform Admin Login
- **URL**: `/platform/login`
- **For**: Platform admins and platform staff
- **Access**: Full platform management (organizations, objects, users)
- **API**: `/api/platform/auth/login`

### Organization Login
- **URL**: `/org/login`
- **For**: Organization admins and organization staff
- **Access**: Organization-scoped (users, objects, tickets for their org)
- **API**: `/api/org/auth/login`

### Legacy Admin Login (Redirects)
- **URL**: `/admin/login`
- **Behavior**: Redirects to `/platform/login` for backward compatibility

---

## 🔑 Authentication Flow

### Platform Users
1. User signs in via Supabase Auth at `/platform/login`
2. System verifies user exists in `platform_users` table
3. System checks user has `role='platform_admin'` or `role='platform_staff'`
4. Session created via Supabase Auth cookies
5. User redirected to `/platform/organizations`

### Organization Users
1. User signs in via Supabase Auth at `/org/login`
2. System verifies user exists in `platform_users` table
3. System checks user does NOT have platform role (must be `NULL`)
4. System verifies user has `organization_memberships`
5. Session created via Supabase Auth cookies
6. User redirected to `/org/dashboard`

---

## 📁 File Structure

### Platform Authentication
- `app/platform/login/page.js` - Platform login UI
- `app/platform/layout.js` - Platform layout with nav
- `app/api/platform/auth/login/route.js` - Login API
- `app/api/platform/auth/logout/route.js` - Logout API
- `app/api/platform/auth/check/route.js` - Auth check API
- `lib/platform-auth.js` - Platform auth utilities

### Organization Authentication
- `app/org/login/page.js` - Organization login UI
- `app/org/layout.js` - Organization layout with nav
- `app/api/org/auth/login/route.js` - Login API
- `app/api/org/auth/logout/route.js` - Logout API
- `app/api/org/auth/check/route.js` - Auth check API
- `lib/staff-auth.js` - Organization user auth utilities

---

## 🛡️ Authorization

### Platform Admin
- **Role**: `platform_admin` in `platform_users.role`
- **Access**: Full CRUD on all platform resources
- **Routes**: `/platform/*`

### Platform Staff
- **Role**: `platform_staff` in `platform_users.role`
- **Access**: Read-only or limited platform access (can be customized)
- **Routes**: `/platform/*`

### Organization Admin
- **Role**: `org_admin` in `organization_memberships.role`
- **Access**: Manage users in organization, assign object roles
- **Routes**: `/org/*`

### Organization Staff
- **Role**: `org_staff` in `organization_memberships.role`
- **Access**: View tickets, objects (read-only)
- **Routes**: `/org/*`, `/admin/tickets` (filtered by object roles)

---

## 🔄 Migration from Old System

### Old System (Deprecated)
- Used `admins` table with password hashes
- Used `admin_sessions` table for session management
- Custom authentication flow

### New System
- Uses Supabase Auth (email/password)
- Uses `platform_users` table (links to Supabase Auth users)
- Session managed by Supabase Auth cookies
- Role-based access via `platform_users.role` and `organization_memberships.role`

### Backward Compatibility
- `/admin/login` redirects to `/platform/login`
- `/admin/*` routes still work but use new auth system
- Old admin session cookies are ignored

---

## 📝 Creating Users

### Platform Users
1. Create user in Supabase Auth (via Supabase Dashboard or API)
2. Create record in `platform_users` table:
   ```sql
   INSERT INTO platform_users (auth_user_id, email, name, role)
   VALUES ('<supabase_auth_user_id>', 'admin@example.com', 'Admin Name', 'platform_admin');
   ```

### Organization Users
1. Create user in Supabase Auth
2. Create record in `platform_users` (with `role=NULL`):
   ```sql
   INSERT INTO platform_users (auth_user_id, email, name, role)
   VALUES ('<supabase_auth_user_id>', 'user@example.com', 'User Name', NULL);
   ```
3. Add to organization:
   ```sql
   INSERT INTO organization_memberships (user_id, organization_id, role)
   VALUES ('<platform_user_id>', '<organization_id>', 'org_admin');
   ```

---

## 🚪 Logout

Both systems use Supabase Auth logout:
- Platform: `POST /api/platform/auth/logout`
- Organization: `POST /api/org/auth/logout`

Both clear Supabase Auth session cookies.

---

## 🔍 Checking Authentication

### Server-Side
```javascript
// Platform user
import { getCurrentPlatformUser } from '@/lib/platform-auth'
const user = await getCurrentPlatformUser()

// Organization user
import { getCurrentStaffUser } from '@/lib/staff-auth'
const user = await getCurrentStaffUser()
```

### Client-Side
```javascript
// Platform
const response = await fetch('/api/platform/auth/check')
const { authenticated, user } = await response.json()

// Organization
const response = await fetch('/api/org/auth/check')
const { authenticated, user } = await response.json()
```

---

## ⚠️ Important Notes

1. **Supabase Auth Required**: All users must have Supabase Auth accounts
2. **Role Separation**: Platform users cannot log in via organization login (and vice versa)
3. **Session Management**: Supabase Auth handles session cookies automatically
4. **Password Reset**: Use Supabase Auth password reset flow
5. **Email Verification**: Configure in Supabase Auth settings

---

## 🎯 Next Steps

1. Create platform admin user in Supabase Auth
2. Create `platform_users` record for admin
3. Test platform login at `/platform/login`
4. Create organization and organization users
5. Test organization login at `/org/login`
