# Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. Supabase account and project
3. Google reCAPTCHA v3 keys (optional for development)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret!)
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Google reCAPTCHA site key (optional)
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key (optional)
- `NEXT_PUBLIC_APP_URL` - Your app URL (http://localhost:3000 for dev)
- `SESSION_SECRET` - Random secret for sessions (generate with: `openssl rand -base64 32`)

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - First: `supabase/migrations/001_schema.sql`
   - Second: `supabase/migrations/002_rls_policies.sql`

### 4. Run Additional Migration

Run the admin sessions migration:
- `supabase/migrations/003_admin_sessions.sql`

### 5. Create Admin User

You need to create at least one admin user to access the admin portal. Use the helper script:

```bash
node scripts/create-admin.js "admin@example.com" "YourPassword123" "Admin Name"
```

This will generate SQL that you can run in Supabase SQL Editor. Or manually create an admin:

```sql
-- First, generate password hash using the script above, then:
INSERT INTO admins (email, password_hash, name, role, is_active)
VALUES (
  'admin@example.com',
  '$2a$10$YourHashedPasswordHere', -- Use the hash from the script
  'Admin Name',
  'admin',
  true
);
```

### 6. Create Test Data (Optional)

Run this SQL in Supabase SQL Editor to create a test tenant:

```sql
-- Create a test tenant
-- Password for last name "Smith" will be hashed
INSERT INTO tenants (tenant_id, first_name, last_name, last_name_hash, email, phone, building_name, unit_number)
VALUES (
  'APT-001',
  'John',
  'Smith',
  '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'john.smith@example.com',
  '+1234567890',
  'Sunset Apartments',
  '101'
);

-- Create a test ticket
INSERT INTO tickets (tenant_id, title, description, status, priority)
SELECT 
  id,
  'Leaky Faucet',
  'The kitchen sink faucet is leaking',
  'open',
  'medium'
FROM tenants WHERE tenant_id = 'APT-001';
```

**Note:** To generate the bcrypt hash for "Smith", you can use an online bcrypt generator or run this in Node.js:
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('Smith', 10).then(console.log);
```

### 7. Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Testing

### Tenant Login
1. Navigate to http://localhost:3000/login
2. Enter Tenant ID and Last Name
3. Complete reCAPTCHA (if configured)
4. You should be redirected to the dashboard

### Admin Login
1. Navigate to http://localhost:3000/admin/login
2. Enter your admin email and password
3. You should be redirected to the tenants management page
4. You can create, edit, import, and delete tenants

## Important Notes

### Security
- Admin routes are NOT protected in MVP - add authentication before production
- Service role key should NEVER be exposed to the client
- RLS policies are set up but application-layer security is primary

### reCAPTCHA
- If reCAPTCHA keys are not configured, the login will still work (with a warning)
- For production, you MUST configure reCAPTCHA

### Database
- Last names are hashed using bcrypt (cost factor 10)
- Sessions expire after 24 hours
- Old sessions are cleaned up on new login

## Next Steps (Post-MVP)

1. Implement admin authentication
2. Add email notifications
3. Integrate with Capmo
4. Add ticket creation/editing for tenants
5. Add file uploads for tickets
6. Implement proper admin role management


