/** Static portfolio demo credentials — not stored in any database. */
export const DEMO_PLATFORM_ADMIN = {
  id: 'static-demo-platform-admin',
  email: 'demo@tanent.app',
  password: 'Demo123!',
  name: 'Demo Admin',
  role: 'platform_admin',
}

export const DEMO_TENANT = {
  id: 'static-demo-tenant',
  tenantId: 'DEMO-001',
  lastName: 'Demo',
  firstName: 'Demo',
  tenant_id: 'DEMO-001',
  first_name: 'Demo',
  last_name: 'Demo',
  is_active: true,
}

/** Org login demo — email/password form, static session (no DB). */
export const DEMO_ORG_USER = {
  id: 'demo-user-org',
  email: 'org-demo@tanent.app',
  password: 'Demo123!',
  name: 'Lea Hoffmann',
  role: null,
  is_active: true,
  memberships: [
    {
      role: 'org_admin',
      organization: { id: 'demo-org-1', name: 'Harbor View Residences' },
    },
  ],
  objectRoles: [],
}

/** Static rows shown in platform admin during a demo session (no DB). */
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
      object_id: 'OBJ-100',
      name: 'Maple Court 12',
      street: '12 Maple Court',
      zip: '10115',
      city: 'Berlin',
      created_at: '2025-11-20T11:00:00.000Z',
      deleted_at: null,
      assignment: [
        {
          owner_org: { id: 'demo-org-1', name: 'Harbor View Residences' },
          tech_org: { id: 'demo-org-2', name: 'Summit Technical Services' },
          warranty_org: { id: 'demo-org-3', name: 'Northline Warranty Co.' },
        },
      ],
    },
    {
      id: 'demo-obj-2',
      object_id: 'OBJ-200',
      name: 'Riverside Lofts',
      street: '88 River Road',
      zip: '20095',
      city: 'Hamburg',
      created_at: '2025-12-10T16:00:00.000Z',
      deleted_at: null,
      assignment: [
        {
          owner_org: { id: 'demo-org-1', name: 'Harbor View Residences' },
          tech_org: { id: 'demo-org-2', name: 'Summit Technical Services' },
          warranty_org: null,
        },
      ],
    },
  ],
  users: [
    {
      id: 'static-demo-platform-admin',
      email: DEMO_PLATFORM_ADMIN.email,
      name: DEMO_PLATFORM_ADMIN.name,
      role: 'platform_admin',
      is_active: true,
      created_at: '2025-11-01T08:00:00.000Z',
      memberships: [],
    },
    {
      id: DEMO_ORG_USER.id,
      email: DEMO_ORG_USER.email,
      name: DEMO_ORG_USER.name,
      role: null,
      is_active: true,
      created_at: '2025-11-15T08:00:00.000Z',
      memberships: DEMO_ORG_USER.memberships,
    },
    {
      id: 'demo-user-staff',
      email: 'tech@summit.demo',
      name: 'Jonas Weber',
      role: null,
      is_active: true,
      created_at: '2025-12-01T08:00:00.000Z',
      memberships: [
        {
          role: 'org_staff',
          organization: { id: 'demo-org-2', name: 'Summit Technical Services' },
        },
      ],
    },
  ],
  tenants: [
    {
      id: 'static-demo-tenant',
      tenant_id: 'DEMO-001',
      first_name: 'Demo',
      last_name: 'Demo',
      email: 'demo.tenant@tanent.app',
      building_name: 'Maple Court 12',
      unit_number: '1A',
      is_active: true,
      created_at: '2025-11-20T12:00:00.000Z',
      object: { id: 'demo-obj-1', name: 'Maple Court 12' },
    },
    {
      id: 'demo-tenant-2',
      tenant_id: 'T-2044',
      first_name: 'Anna',
      last_name: 'Keller',
      email: 'anna.keller@example.com',
      building_name: 'Riverside Lofts',
      unit_number: '12A',
      is_active: true,
      created_at: '2025-12-12T12:00:00.000Z',
      object: { id: 'demo-obj-2', name: 'Riverside Lofts' },
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
        id: 'demo-tenant-2',
        tenant_id: 'T-2044',
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
        first_name: 'Anna',
        last_name: 'Keller',
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
        id: 'static-demo-tenant',
        tenant_id: 'DEMO-001',
        first_name: 'Demo',
        last_name: 'Demo',
        building_name: 'Maple Court 12',
        unit_number: '1A',
      },
      object: { id: 'demo-obj-1', name: 'Maple Court 12' },
    },
  ],
  locations: [
    { id: 'demo-loc-1', label: 'Kitchen', display_order: 1, deleted_at: null },
    { id: 'demo-loc-2', label: 'Bathroom', display_order: 2, deleted_at: null },
    { id: 'demo-loc-3', label: 'Living room', display_order: 3, deleted_at: null },
    { id: 'demo-loc-4', label: 'Hallway', display_order: 4, deleted_at: null },
  ],
}

export function isDemoPlatformCredentials(email, password) {
  return (
    String(email || '').trim().toLowerCase() === DEMO_PLATFORM_ADMIN.email &&
    String(password || '') === DEMO_PLATFORM_ADMIN.password
  )
}

export function isDemoTenantCredentials(tenantId, lastName) {
  return (
    String(tenantId || '').trim().toUpperCase() === DEMO_TENANT.tenantId &&
    String(lastName || '').trim() === DEMO_TENANT.lastName
  )
}

export function isDemoOrgCredentials(email, password) {
  return (
    String(email || '').trim().toLowerCase() === DEMO_ORG_USER.email &&
    String(password || '') === DEMO_ORG_USER.password
  )
}
