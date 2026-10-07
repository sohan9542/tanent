/**
 * Public portfolio demo credentials and sample data.
 * Safe to expose in the UI — these are not production secrets.
 */

export const DEMO_PLATFORM_ADMIN = {
  id: 'demo-platform-admin',
  email: 'demo@tanent.app',
  password: 'Demo123!',
  name: 'Demo Admin',
  role: 'platform_admin',
  is_active: true,
  isDemo: true,
}

export const DEMO_ORG_USER = {
  id: 'demo-org-user',
  email: 'org-demo@tanent.app',
  password: 'Demo123!',
  name: 'Demo Org Admin',
  role: null,
  is_active: true,
  isDemo: true,
  memberships: [
    {
      role: 'org_admin',
      organization: {
        id: 'demo-org-1',
        name: 'Harbor View Residences',
      },
    },
  ],
  objectRoles: [],
}

export const DEMO_SAMPLE_DATA = {
  organizations: [
    {
      id: 'demo-org-1',
      name: 'Harbor View Residences',
      created_at: '2025-11-12T10:00:00.000Z',
      logo_url: null,
    },
    {
      id: 'demo-org-2',
      name: 'Summit Technical Services',
      created_at: '2025-12-03T14:30:00.000Z',
      logo_url: null,
    },
    {
      id: 'demo-org-3',
      name: 'Northline Warranty Co.',
      created_at: '2026-01-18T09:15:00.000Z',
      logo_url: null,
    },
  ],
  objects: [
    {
      id: 'demo-obj-1',
      name: 'Maple Court 12',
      address: '12 Maple Court',
      city: 'Berlin',
      created_at: '2025-11-20T11:00:00.000Z',
      deleted_at: null,
      assignment: {
        owner_org: { id: 'demo-org-1', name: 'Harbor View Residences' },
        tech_org: { id: 'demo-org-2', name: 'Summit Technical Services' },
        warranty_org: { id: 'demo-org-3', name: 'Northline Warranty Co.' },
      },
    },
    {
      id: 'demo-obj-2',
      name: 'Riverside Lofts',
      address: '88 River Road',
      city: 'Hamburg',
      created_at: '2025-12-10T16:00:00.000Z',
      deleted_at: null,
      assignment: {
        owner_org: { id: 'demo-org-1', name: 'Harbor View Residences' },
        tech_org: { id: 'demo-org-2', name: 'Summit Technical Services' },
        warranty_org: null,
      },
    },
  ],
  users: [
    {
      id: 'demo-platform-admin',
      email: DEMO_PLATFORM_ADMIN.email,
      name: DEMO_PLATFORM_ADMIN.name,
      role: 'platform_admin',
      is_active: true,
      created_at: '2025-11-01T08:00:00.000Z',
      memberships: [],
    },
    {
      id: 'demo-org-user',
      email: DEMO_ORG_USER.email,
      name: DEMO_ORG_USER.name,
      role: null,
      is_active: true,
      created_at: '2025-11-15T08:00:00.000Z',
      memberships: DEMO_ORG_USER.memberships,
    },
  ],
  tickets: [
    {
      id: 'demo-ticket-1',
      status: 'Open',
      category: 'Plumbing',
      urgency: 'high',
      description: 'Kitchen sink leak under cabinet',
      warranty_flag: false,
      created_at: '2026-02-01T09:30:00.000Z',
      tenant: {
        id: 'demo-tenant-1',
        tenant_id: 'T-1001',
        first_name: 'Anna',
        last_name: 'Keller',
        building_name: 'Maple Court 12',
        unit_number: '3B',
      },
      object: { id: 'demo-obj-1', name: 'Maple Court 12' },
    },
    {
      id: 'demo-ticket-2',
      status: 'In Review',
      category: 'Heating',
      urgency: 'medium',
      description: 'Radiator not warming in living room',
      warranty_flag: true,
      created_at: '2026-02-10T13:00:00.000Z',
      tenant: {
        id: 'demo-tenant-2',
        tenant_id: 'T-2044',
        first_name: 'Jonas',
        last_name: 'Weber',
        building_name: 'Riverside Lofts',
        unit_number: '12A',
      },
      object: { id: 'demo-obj-2', name: 'Riverside Lofts' },
    },
    {
      id: 'demo-ticket-3',
      status: 'Closed',
      category: 'Electrical',
      urgency: 'low',
      description: 'Hallway light flicker resolved',
      warranty_flag: false,
      created_at: '2026-01-22T17:45:00.000Z',
      tenant: {
        id: 'demo-tenant-3',
        tenant_id: 'T-1188',
        first_name: 'Mira',
        last_name: 'Hoffmann',
        building_name: 'Maple Court 12',
        unit_number: '1C',
      },
      object: { id: 'demo-obj-1', name: 'Maple Court 12' },
    },
  ],
}

export function matchesDemoPlatformCredentials(email, password) {
  return (
    typeof email === 'string' &&
    typeof password === 'string' &&
    email.trim().toLowerCase() === DEMO_PLATFORM_ADMIN.email.toLowerCase() &&
    password === DEMO_PLATFORM_ADMIN.password
  )
}

export function matchesDemoOrgCredentials(email, password) {
  return (
    typeof email === 'string' &&
    typeof password === 'string' &&
    email.trim().toLowerCase() === DEMO_ORG_USER.email.toLowerCase() &&
    password === DEMO_ORG_USER.password
  )
}

export function isDemoModeEnabled() {
  return (
    process.env.DEMO_MODE === 'true' ||
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  )
}
