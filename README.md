# Tenant Management System - Milestone 2

A Next.js application for tenant and ticket management with Supabase backend, featuring guided defect reporting, AI-assisted follow-ups, and role-based ticket visibility.

## Demo login (static — no database)

Works even when Supabase is down. No seeding required.

| Page | Credentials | Action |
|------|-------------|--------|
| `/login` | Tenant ID `DEMO-001` · Last Name `Demo` | **Fill demo** → Sign in |
| `/platform/login` | `demo@tanent.app` / `Demo123!` | **Fill demo** → Sign in |

reCAPTCHA is always bypassed on tenant login.

## Features (Milestone 2)

- **Guided Defect Reporting Wizard**: Multi-step form for tenants to report defects with category, location, description, urgency, and image uploads
- **AI-Assisted Follow-ups**: OpenAI-powered questions to improve data quality (gracefully degrades if API key not provided)
- **Pre-Ticket System**: Thread-based clarification system before finalizing tickets
- **Image Upload**: Support for up to 5 images per ticket/pre-ticket (max 5MB each, JPG/PNG/WebP)
- **Object-Based Role System**: Organization-scoped, object-based roles (owner/technical/warranty per object)
- **Platform Admin**: Full platform management (organizations, objects, users)
- **Organization Admin**: Manage organization users and assign object roles
- **Role-Based Ticket Visibility**: Staff see tickets based on their object roles and organization assignments
- **Dual Login System**: Separate login for platform admins (`/platform/login`) and organization users (`/org/login`)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

3. Run database migrations in Supabase SQL Editor (in order):
   - Run `supabase/migrations/001_schema.sql`
   - Run `supabase/migrations/002_rls_policies.sql`
   - Run `supabase/migrations/003_admin_sessions.sql`
   - Run `supabase/migrations/004_milestone2_schema.sql`
   - Run `supabase/migrations/005_milestone2_rls.sql`
   - Run `supabase/migrations/006_correct_role_system.sql` (Object-based role system)
   - Run `supabase/migrations/007_correct_rls.sql` (RLS for new tables)
   - Run `supabase/migrations/008_finalize_role_system.sql` (Finalize migration)

4. Set up Supabase Storage:
   - **See detailed instructions in `SUPABASE_STORAGE_SETUP.md`**
   - Quick setup: Go to Supabase Dashboard → Storage → Create bucket named `ticket-images` → Set to **Public**

5. Set up Authentication:
   - **See detailed instructions in `AUTHENTICATION_SYSTEM.md`**
   - Create platform admin user in Supabase Auth
   - Create `platform_users` record linking to Supabase Auth user
   - Login at `/platform/login` for platform admins or `/org/login` for organization users

6. Start the development server:
```bash
npm run dev
```

## Environment Variables

Required environment variables (add to `.env.local`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration (Optional - system works without it)
OPENAI_API_KEY=your_openai_api_key
```

### Environment Variable Details

- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL (found in Project Settings → API)
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Your Supabase anonymous/public key (found in Project Settings → API)
- **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key (found in Project Settings → API, keep this secret!)
- **OPENAI_API_KEY**: (Optional) Your OpenAI API key for AI-assisted follow-up questions. If not provided, the system will work without AI features.

## Project Structure

- `app/` - Next.js App Router pages and API routes
  - `report-defect/` - Multi-step defect reporting wizard
  - `pre-tickets/[id]/` - Pre-ticket thread view
  - `admin/tickets/` - Admin ticket management pages
  - `api/ai/followups/` - OpenAI API endpoint
  - `api/pre-tickets/` - Pre-ticket CRUD endpoints
- `lib/` - Utility functions and Supabase clients
  - `storage.js` - Image upload utilities
  - `staff-auth.js` - Staff authentication and role-based access
- `components/` - React components
- `supabase/migrations/` - Database migration files

## Database Schema

### New Tables (Milestone 2)
- `buildings` - Building/object information with organization assignments
- `organizations` - Owner/Technical/Warranty organizations
- `staff_users` - Staff users linked to Supabase Auth
- `user_roles` - Many-to-many relationship for staff roles
- `pre_tickets` - Pre-ticket records before finalization
- `pre_ticket_messages` - Message thread for pre-tickets

### Updated Tables
- `tickets` - Enhanced with category, urgency, images, AI data, building_id
- `tenants` - Added building_id reference

## Usage

### For Tenants
1. Log in with tenant ID and last name
2. Navigate to "Report a Defect" from the dashboard
3. Complete the multi-step wizard:
   - Select defect category
   - Enter location details (optional)
   - Describe the issue (AI follow-ups may appear)
   - Set urgency level
   - Review and submit
4. View pre-ticket thread, add messages/clarifications
5. Finalize pre-ticket to create actual ticket

### For Staff/Admins
1. Log in with admin credentials (or Supabase Auth for staff)
2. Navigate to Tickets section
3. View tickets filtered by building assignments based on roles
4. View ticket details including images, messages, and tenant info

## Rate Limiting

The AI follow-ups endpoint includes rate limiting to prevent abuse. Rate limits are applied per IP address.

## Storage

Images are stored in Supabase Storage bucket `ticket-images`. Make sure the bucket is configured with appropriate CORS and access policies.

## Notes

- AI features gracefully degrade if `OPENAI_API_KEY` is not provided
- Staff authentication uses Supabase Auth (implementation can be extended)
- Role-based access is enforced at the application layer
- All image uploads are validated server-side
