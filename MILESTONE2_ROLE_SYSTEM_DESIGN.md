# Milestone 2: Object-Based Role System - Implementation Design

## 1. ER DIAGRAM (Textual)

```
┌─────────────────┐
│   PLATFORM      │
│   LEVEL         │
│                 │
│  platform_users │ (Supabase Auth + metadata)
│  - id           │
│  - auth_user_id │
│  - role         │ (platform_admin | platform_staff)
│  - email        │
│  - name         │
└─────────────────┘
         │
         │ creates/manages
         ▼
┌─────────────────┐
│ ORGANIZATIONS   │
│ - id            │
│ - name          │
│ - type          │ (owner | technical | warranty)
│ - created_at    │
└─────────────────┘
         │
         │ contains
         ▼
┌──────────────────────┐
│ ORGANIZATION         │
│ MEMBERSHIPS          │
│ - user_id            │ → platform_users
│ - organization_id    │ → organizations
│ - role               │ (org_admin | org_staff)
│ - created_at         │
└──────────────────────┘
         │
         │ (users in orgs can have roles on objects)
         ▼
┌─────────────────┐
│   OBJECTS       │
│   (buildings)   │
│ - id            │
│ - name          │
│ - address       │
│ - created_at    │
└─────────────────┘
         │
         │ has assignments
         ▼
┌──────────────────────┐
│ OBJECT_ASSIGNMENTS   │
│ - object_id          │ → objects
│ - owner_org_id      │ → organizations (nullable)
│ - tech_org_id       │ → organizations (nullable)
│ - warranty_org_id   │ → organizations (nullable)
└──────────────────────┘
         │
         │ (users have roles on specific objects)
         ▼
┌──────────────────────┐
│ OBJECT_ROLES         │
│ - user_id            │ → platform_users
│ - object_id          │ → objects
│ - organization_id    │ → organizations
│ - role_type          │ (owner | technical | warranty)
│ - category_scope     │ (nullable, for warranty)
│ - created_at         │
└──────────────────────┘
         │
         │ (tickets belong to objects)
         ▼
┌─────────────────┐
│   TICKETS       │
│ - id            │
│ - object_id     │ → objects (renamed from building_id)
│ - tenant_id     │ → tenants
│ - ...           │
└─────────────────┘
```

## 2. EXACT TABLE LIST + RELATIONSHIPS

### Core Tables

**platform_users**
- id (UUID, PK)
- auth_user_id (UUID, UNIQUE, NOT NULL) - Supabase Auth user ID
- email (VARCHAR, UNIQUE, NOT NULL)
- name (VARCHAR, NOT NULL)
- role (VARCHAR) - 'platform_admin' | 'platform_staff' | NULL (if org user)
- is_active (BOOLEAN, DEFAULT true)
- created_at, updated_at

**organizations**
- id (UUID, PK)
- name (VARCHAR, NOT NULL)
- created_at, updated_at
- NOTE: Organizations do NOT have a fixed type. The same organization can be owner for Object A and technical for Object B. The role comes from object_assignments.

**organization_memberships**
- id (UUID, PK)
- user_id (UUID, FK → platform_users)
- organization_id (UUID, FK → organizations)
- role (VARCHAR, CHECK: 'org_admin' | 'org_staff')
- created_at
- UNIQUE(user_id, organization_id)

**objects** (renamed from buildings)
- id (UUID, PK)
- name (VARCHAR, NOT NULL)
- address (TEXT)
- created_at, updated_at

**object_assignments**
- id (UUID, PK)
- object_id (UUID, FK → objects)
- owner_org_id (UUID, FK → organizations, nullable)
- tech_org_id (UUID, FK → organizations, nullable)
- warranty_org_id (UUID, FK → organizations, nullable)
- created_at, updated_at
- UNIQUE(object_id) - one assignment per object

**object_roles**
- id (UUID, PK)
- user_id (UUID, FK → platform_users)
- object_id (UUID, FK → objects)
- organization_id (UUID, FK → organizations)
- role_type (VARCHAR, CHECK: 'owner' | 'technical' | 'warranty')
- category_scope (VARCHAR, nullable) - for warranty category filtering (e.g., 'plumbing', 'electrical')
- created_at, updated_at
- UNIQUE(user_id, object_id, organization_id, role_type)
- CONSTRAINT: organization_id in object_roles MUST match the organization assigned in object_assignments for that role_type

**tenants** (existing, update)
- id (UUID, PK)
- ... existing fields ...
- object_id (UUID, FK → objects, nullable) - renamed from building_id

**tickets** (existing, update)
- id (UUID, PK)
- ... existing fields ...
- object_id (UUID, FK → objects, nullable) - renamed from building_id

**pre_tickets** (existing, update)
- id (UUID, PK)
- ... existing fields ...
- object_id (UUID, FK → objects, nullable) - renamed from building_id

### Relationships Summary

1. **Platform Users** → can have **Organization Memberships** (many-to-many)
2. **Organizations** → can have **Organization Memberships** (many-to-many)
3. **Objects** → have **Object Assignments** (one-to-one)
4. **Objects** → have **Object Roles** (one-to-many)
5. **Platform Users** → have **Object Roles** on specific objects (many-to-many)
6. **Organizations** → referenced in **Object Roles** (many-to-many)
7. **Objects** → contain **Tickets** (one-to-many)
8. **Objects** → contain **Tenants** (one-to-many)

## 3. UI PAGES TO BE BUILT

### Platform Admin UI (requires platform_admin role)

**Routes:**
- `/platform/organizations` - List/Create/Edit/Delete organizations
- `/platform/organizations/[id]` - View/Edit organization details
- `/platform/objects` - List/Create/Edit/Delete objects (buildings)
- `/platform/objects/[id]` - View/Edit object details
- `/platform/objects/[id]/assignments` - Assign organizations to object (owner/tech/warranty)
  - Select organization for owner_org_id, tech_org_id, warranty_org_id
  - Same organization can be assigned to multiple role types on different objects
- `/platform/users` - List/Create Platform Staff users (users with platform_admin or platform_staff role)
- `/platform/users/[id]` - View/Edit platform user

### Organization Admin UI (requires org_admin role in at least one org)

**Routes:**
- `/org/dashboard` - Overview of organization (shows objects where org is assigned)
- `/org/users` - List/Create/Edit users in own organization
  - Add users to organization_memberships with role='org_admin' or 'org_staff'
- `/org/users/[id]` - View/Edit organization user
- `/org/objects` - List objects where org is assigned (via object_assignments)
  - Shows objects where org is owner_org_id, tech_org_id, or warranty_org_id
- `/org/objects/[id]/roles` - Assign org users to objects with role types
  - Can only assign role_types that match org's assignment on that object
  - Example: If org is owner_org_id for object, can only assign role_type='owner'
  - Can set category_scope for warranty roles

### Ticket Views (Role-Aware)

**Routes:**
- `/admin/tickets` - List tickets (filtered by object roles)
- `/admin/tickets/[id]` - View ticket details (if user has access)

**Visibility Rules:**
- Platform Admin: See all tickets
- Organization Admin/Staff: See tickets for objects where:
  - User has `object_role` on that object
  - AND `object_role.organization_id` matches the organization assigned in `object_assignments` for that role_type:
    - If role_type='owner' → must match object_assignment.owner_org_id
    - If role_type='technical' → must match object_assignment.tech_org_id
    - If role_type='warranty' → must match object_assignment.warranty_org_id
  - AND (if role_type='warranty' AND category_scope is set) → ticket.category must match category_scope

## 4. RLS STRATEGY SUMMARY

### Tenant Access
- Tenants: Can only SELECT their own records (tenants, pre_tickets, tickets)
- RLS policies filter by tenant_id from session

### Staff Access
- Platform Admin: Bypass RLS (use service role) OR allow all SELECT
- Organization Users: Complex filtering required
  - RLS can't easily handle object_role + object_assignment logic
  - **Strategy**: Use application-layer filtering with service role
  - RLS policies: Allow SELECT for authenticated users, filter in app layer

### Objects & Organizations
- Platform Admin: Full CRUD access to all organizations and objects
- Organization Admin: 
  - Can view own organization
  - Can view objects where organization is assigned (via object_assignments)
  - Can manage users in own organization (organization_memberships)
  - Can create object_roles for org users on objects where org is assigned
- Organization Staff: Read-only access to same objects as org admin

### Implementation Approach
- Use service role for complex queries
- Implement authorization functions in application layer
- RLS provides basic tenant isolation
- Complex role-based filtering done server-side

## 5. WHAT WILL BE VISIBLE/USABLE AT END OF MILESTONE 2

### For Tenants
✅ Report defects via wizard
✅ View own pre-tickets
✅ View own tickets
✅ Add messages to pre-tickets
✅ Finalize pre-tickets → create tickets

### For Platform Admin
✅ Create/Manage organizations
✅ Create/Manage objects (buildings)
✅ Assign organizations to objects (owner/tech/warranty)
✅ Create Platform Staff users
✅ View all tickets across all objects
✅ View all tenants

### For Organization Admin
✅ View own organization details
✅ Create/Manage users in own organization (add to organization_memberships)
✅ Assign org users to objects with role types (create object_roles)
  - Can assign users to objects where organization is assigned (owner/tech/warranty)
  - Must match: if assigning role_type='owner', org must be owner_org_id in object_assignment
✅ View tickets for objects where user has object_role (same visibility as org_staff)
✅ View tenants in objects where org is assigned

### For Organization Staff
✅ View tickets for objects where user has object_role
✅ View ticket details (read-only)
✅ View tenants in accessible objects (read-only)

### Authorization Flow Example

**Scenario**: User "John" is in "ABC Property Management" (technical org)
- John has `object_role` on "Building A" with role_type='technical'
- "Building A" has `object_assignment` with tech_org_id = ABC Property Management
- Ticket T1 belongs to "Building A"
- **Result**: John can see T1

**Scenario**: Same user "John" 
- John has `object_role` on "Building B" with role_type='owner'
- "Building B" has `object_assignment` with owner_org_id = ABC Property Management
- Ticket T2 belongs to "Building B"
- **Result**: John can see T2

**Scenario**: User "Jane" is in "XYZ Tech" organization
- Jane has `object_role` on "Building A" with role_type='technical' and organization_id='XYZ Tech'
- "Building A" has `object_assignment` with tech_org_id = 'ABC Property Management' (different org!)
- **Result**: Jane CANNOT see tickets for Building A (org mismatch - XYZ Tech is not assigned as tech org for Building A)

**Scenario**: User "Bob" is in "MultiOrg Inc" organization
- Bob has `object_role` on "Building A" with role_type='owner' and organization_id='MultiOrg Inc'
- Bob has `object_role` on "Building B" with role_type='technical' and organization_id='MultiOrg Inc'
- "Building A" has `object_assignment` with owner_org_id = 'MultiOrg Inc' ✅
- "Building B" has `object_assignment` with tech_org_id = 'MultiOrg Inc' ✅
- **Result**: Bob can see tickets for both Building A (as owner) and Building B (as technical)

## 6. MIGRATION STRATEGY

### Step 1: Create New Tables
- platform_users
- organization_memberships  
- objects (rename from buildings)
- object_assignments
- object_roles

### Step 2: Migrate Existing Data
- Convert `buildings` → `objects` (copy all data)
- Convert `staff_users` → `platform_users` (copy all data, set role=NULL for org users)
- Create `organization_memberships` from staff_users.organization_id (set role='org_staff' by default, can be updated later)
- Create `object_assignments` from buildings.owner_org_id, tech_org_id, warranty_org_id
- Create `object_roles` based on user_roles:
  - For each user_role like 'owner_admin' or 'owner_user':
    - Find all objects where object_assignment.owner_org_id matches user's organization
    - Create object_role with role_type='owner'
  - Similar for tech_* and warranty_* roles
  - NOTE: This migration assumes users had access to all objects for their org type. May need manual adjustment.

### Step 3: Update References
- Rename building_id → object_id in tickets, pre_tickets, tenants
- Update all queries

### Step 4: Remove Old Tables
- Drop `user_roles` (replaced by object_roles)
- Drop old `buildings` table (replaced by objects)

## 7. CONFLICTS WITH CURRENT CODE

**Current Issues:**
1. `buildings` table has direct org_id columns → needs `object_assignments` table (separate)
2. `organizations` table has `type` field → REMOVE this (orgs don't have fixed types)
3. `staff_users` has single `organization_id` → needs `organization_memberships` (many-to-many)
4. `user_roles` has global roles → needs `object_roles` (object-scoped)
5. `lib/staff-auth.js` uses simplified role checking → needs complete rewrite
6. No platform level users → needs `platform_users` table
7. All references to `building_id` → rename to `object_id`
8. No admin UIs for managing the system → needs full admin interface

**Refactoring Required:**
- All staff authentication/authorization code
- All ticket visibility queries (must check object_roles + object_assignments)
- All building → object references (rename building_id to object_id everywhere)
- All role checking logic (object-based, not global)
- Remove organizations.type constraint
- Update all queries that reference buildings table

## 8. IMPLEMENTATION ORDER

1. **Database Migration** (006_correct_role_system.sql)
   - Create `platform_users` table
   - Create `organization_memberships` table
   - Create `objects` table (rename from buildings)
   - Create `object_assignments` table
   - Create `object_roles` table
   - Migrate data from old tables
   - Update references: building_id → object_id in tickets, pre_tickets, tenants
   - Remove `organizations.type` field
   - Drop old `user_roles` table
   - Keep `buildings` table temporarily for data migration, then drop

2. **Authentication & Authorization Utilities**
   - Create `lib/platform-auth.js` - Platform admin/staff authentication
   - Rewrite `lib/staff-auth.js` - Organization user authentication
   - Create `lib/object-auth.js` - Object role checking and ticket visibility
   - Key function: `getAccessibleObjectIds(user)` - returns object IDs user can access
   - Key function: `canAccessTicket(user, ticket)` - checks object_role + object_assignment match

3. **Platform Admin UI**
   - `/platform/organizations` - CRUD for organizations (no type field)
   - `/platform/objects` - CRUD for objects
   - `/platform/objects/[id]/assignments` - Assign orgs to objects
   - `/platform/users` - Manage platform_admin and platform_staff users

4. **Organization Admin UI**
   - `/org/dashboard` - Overview
   - `/org/users` - Manage users in organization (organization_memberships)
   - `/org/objects` - View objects where org is assigned
   - `/org/objects/[id]/roles` - Assign org users to objects (create object_roles)

5. **Update Ticket Views**
   - Rewrite `/admin/tickets` - Filter by accessible object IDs
   - Rewrite `/admin/tickets/[id]` - Check access before showing
   - Update all ticket queries to use object-based filtering

6. **RLS Policies** (007_correct_rls.sql)
   - Tenant isolation (unchanged)
   - Platform admin: Full access
   - Organization users: Basic SELECT policies, complex filtering in app layer

7. **Update All References**
   - Rename building_id → object_id in all code
   - Update all queries
   - Update all components

8. **Testing & Validation**
   - Verify role-based access
   - Test all authorization paths
   - Test multi-org scenarios

## 9. KEY DESIGN DECISIONS

### Organizations Don't Have Types
- **Decision**: Removed `organizations.type` field
- **Reason**: Same organization can be owner for Object A and technical for Object B
- **Impact**: Organization type is determined by `object_assignments`, not organization itself

### Object Roles Must Match Assignments
- **Decision**: `object_roles.organization_id` must match the org assigned in `object_assignments` for that role_type
- **Reason**: Ensures users can only have roles on objects where their org is actually assigned
- **Validation**: When creating object_role, verify:
  - If role_type='owner' → organization_id must equal object_assignment.owner_org_id
  - If role_type='technical' → organization_id must equal object_assignment.tech_org_id
  - If role_type='warranty' → organization_id must equal object_assignment.warranty_org_id

### Category Scope for Warranty
- **Decision**: `object_roles.category_scope` is optional, only for warranty roles
- **Reason**: Warranty managers might only handle specific defect categories
- **Impact**: If category_scope is set, user only sees tickets matching that category

### Platform vs Organization Users
- **Decision**: All staff users are in `platform_users`, distinguished by `role` field
- **Reason**: Platform admins/staff have platform-level access, org users have org-level access
- **Impact**: Single table for all staff, role determines access level

---

**DESIGN UPDATED - READY FOR IMPLEMENTATION**
