import { NextResponse } from 'next/server'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { getObjectsForOrganization } from '@/lib/object-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/org/objects/[id] - Get object details (if org is assigned)
 */
export async function GET(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Get object assignment
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('object_assignments')
      .select('*')
      .eq('object_id', id)
      .single()

    if (assignError || !assignment) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    // Verify org is assigned to this object
    const orgIsAssigned = 
      orgIds.includes(assignment.owner_org_id) ||
      orgIds.includes(assignment.tech_org_id) ||
      orgIds.includes(assignment.warranty_org_id)

    if (!orgIsAssigned) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get object
    const { data: object, error } = await supabaseAdmin
      .from('objects')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !object) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      object,
      assignment
    })
  } catch (error) {
    console.error('Get object error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
