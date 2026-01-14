# Organization Login Explanation

## Important Clarification

**Organizations themselves do NOT login.** Organizations are just entities (like companies or groups).

**Organization USERS login** - these are individual people who belong to an organization.

---

## How It Works

### Step 1: Create Organization
- Platform Admin goes to `/platform/organizations/new`
- Creates an organization with just a **name** (e.g., "ABC Property Management")
- No password needed - it's just creating the organization entity

### Step 2: Create Organization Users
- Organization Admin (or Platform Admin) goes to `/org/users/new` (or `/platform/organizations/[id]`)
- Creates a **user** with:
  - Email (e.g., `john@abc-property.com`)
  - Name (e.g., `John Doe`)
  - Password (e.g., `securepassword123`)
  - Role (`org_admin` or `org_staff`)

### Step 3: User Logs In
- The user goes to `/org/login`
- Enters their **email** and **password** (set in Step 2)
- Gets access to their organization's dashboard

---

## Example Flow

1. **Platform Admin** creates organization "ABC Property Management"
   - Organization ID: `abc-123`
   - No password - just a name

2. **Platform Admin** (or Organization Admin) creates user:
   - Email: `john@abc-property.com`
   - Password: `password123`
   - Role: `org_admin`
   - Links user to organization `abc-123`

3. **John** logs in at `/org/login`:
   - Email: `john@abc-property.com`
   - Password: `password123`
   - Gets access to ABC Property Management dashboard

---

## Key Points

- ✅ Organizations = Entities (no login)
- ✅ Organization Users = People (they login)
- ✅ Each user has their own email/password
- ✅ Users belong to organizations via `organization_memberships`
- ✅ Users login at `/org/login` with their email/password

---

## Where to Create Organization Users

### Option 1: Via Organization Detail Page
- Go to `/platform/organizations`
- Click "View" on an organization
- Click "Add User to Organization"
- Creates user and links them to that organization

### Option 2: Via Organization Admin Portal
- Organization Admin logs in at `/org/login`
- Goes to `/org/users`
- Clicks "Add User"
- Creates user in their organization

---

## Summary

**Question**: "How does an organization login? We only take name when creating it."

**Answer**: Organizations don't login. When you create an organization, you're just creating the entity. Then you create **users** who belong to that organization. Those users login with their email/password at `/org/login`.
