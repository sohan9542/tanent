# How to Create Platform Admin and Platform Staff Users

## Overview

Platform users (admins and staff) need to be created in two steps:
1. **Create user in Supabase Auth** - Authentication account
2. **Create record in `platform_users` table** - Platform user profile with role

---

## Method 1: Using the Script (Recommended)

### Prerequisites
- Node.js installed
- Environment variables set (`.env.local`)
- Install dependencies: `npm install` (includes `dotenv`)

### Steps

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Run the creation script:**
   ```bash
   node scripts/create-platform-user.js <email> <name> <role>
   ```

3. **Examples:**
   ```bash
   # Create platform admin
   node scripts/create-platform-user.js admin@example.com "Admin Name" platform_admin
   
   # Create platform staff
   node scripts/create-platform-user.js staff@example.com "Staff Name" platform_staff
   ```

4. **Enter password when prompted** (minimum 6 characters)

5. **Login** at `/platform/login` with the email and password

---

## Method 2: Manual Creation via Supabase Dashboard

### Step 1: Create User in Supabase Auth

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter:
   - **Email**: `admin@example.com`
   - **Password**: (choose a secure password)
   - **Auto Confirm User**: ✅ Check this box
4. Click "Create User"
5. **Copy the User ID** (UUID) - you'll need this for Step 2

### Step 2: Create Platform User Record

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL (replace values):

```sql
-- For Platform Admin
INSERT INTO platform_users (auth_user_id, email, name, role, is_active)
VALUES (
  '<paste-auth-user-id-here>',  -- From Step 1
  'admin@example.com',
  'Admin Name',
  'platform_admin',
  true
);

-- For Platform Staff
INSERT INTO platform_users (auth_user_id, email, name, role, is_active)
VALUES (
  '<paste-auth-user-id-here>',  -- From Step 1
  'staff@example.com',
  'Staff Name',
  'platform_staff',
  true
);
```

---

## Method 3: Using Supabase Auth Admin API

### Using JavaScript/Node.js

```javascript
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './lib/supabase/server.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create Supabase Admin client
const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createPlatformAdmin(email, password, name) {
  // Step 1: Create auth user
  const { data: authData, error: authError } = await supabaseAdminClient.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  })

  if (authError) {
    console.error('Auth error:', authError)
    return
  }

  // Step 2: Create platform_users record
  const { data: platformUser, error: platformError } = await supabaseAdmin
    .from('platform_users')
    .insert({
      auth_user_id: authData.user.id,
      email: email,
      name: name,
      role: 'platform_admin',
      is_active: true
    })
    .select()
    .single()

  if (platformError) {
    console.error('Platform user error:', platformError)
    return
  }

  console.log('Platform admin created:', platformUser)
}

// Usage
createPlatformAdmin('admin@example.com', 'secure-password', 'Admin Name')
```

---

## Roles Explained

### `platform_admin`
- **Full access** to all platform features
- Can manage organizations, objects, users
- Can assign organizations to objects
- Can create/edit/delete platform users
- **Use for**: Primary administrators, system owners

### `platform_staff`
- **Limited access** (can be customized)
- Typically read-only or limited write access
- **Use for**: Support staff, junior admins

---

## Verification

After creating a user, verify it works:

1. **Check Supabase Auth:**
   - Go to Authentication → Users
   - Verify user exists and email is confirmed

2. **Check platform_users table:**
   ```sql
   SELECT * FROM platform_users WHERE email = 'admin@example.com';
   ```

3. **Test Login:**
   - Go to `/platform/login`
   - Enter email and password
   - Should redirect to `/platform/organizations`

---

## Troubleshooting

### "User not found" error
- Verify `auth_user_id` matches Supabase Auth user ID exactly
- Check that user exists in Supabase Auth → Users

### "Access denied" on login
- Verify `role` is set to `platform_admin` or `platform_staff` (not NULL)
- Check `is_active` is `true`
- Verify email matches exactly (case-sensitive)

### "Invalid email or password"
- Verify password is correct
- Check that email is confirmed in Supabase Auth
- Try resetting password in Supabase Auth

### Script fails with "Missing environment variables"
- Ensure `.env.local` has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## Quick Start Example

```bash
# 1. Create platform admin
node scripts/create-platform-user.js admin@example.com "John Admin" platform_admin
# Enter password when prompted

# 2. Login at http://localhost:3000/platform/login
# Email: admin@example.com
# Password: (the password you entered)
```

---

## Security Notes

1. **Use strong passwords** (minimum 12 characters, mix of letters, numbers, symbols)
2. **Keep service role key secret** - never commit to git
3. **Limit platform_admin users** - only create as needed
4. **Use platform_staff** for users who don't need full admin access
5. **Enable 2FA** in Supabase Auth settings for production
