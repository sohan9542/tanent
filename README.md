# Tenant Management System - Phase 1 MVP

A Next.js application for tenant and ticket management with Supabase backend.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

3. Run database migrations in Supabase SQL Editor:
   - Run `supabase/migrations/001_schema.sql`
   - Run `supabase/migrations/002_rls_policies.sql`

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for required variables.

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `lib/` - Utility functions and Supabase clients
- `components/` - React components
- `supabase/migrations/` - Database migration files


