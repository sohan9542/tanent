import { NextResponse } from 'next/server'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { getObjectsForOrganization } from '@/lib/object-auth'

/**
 * GET /api/org/objects - Get objects where organization is assigned
 */
export async function GET() {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const organizations = getUserOrganizations(staffUser)
    if (organizations.length === 0) {
      return NextResponse.json({
        objects: []
      })
    }

    // Get objects for primary organization
    const orgId = organizations[0].id
    const assignments = await getObjectsForOrganization(orgId)

    const objects = assignments.map(a => ({
      ...a.object,
      assignment: {
        owner_org_id: a.owner_org_id,
        tech_org_id: a.tech_org_id,
        warranty_org_id: a.warranty_org_id
      }
    }))

    return NextResponse.json({
      objects
    })
  } catch (error) {
    console.error('Get objects error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
