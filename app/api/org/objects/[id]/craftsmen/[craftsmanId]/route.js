import { NextResponse } from 'next/server'
import { getCurrentStaffUser, isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * DELETE /api/org/objects/[id]/craftsmen/[craftsmanId] - Unassign a craftsman from an object
 * Only org admins from the TECHNICAL organization can unassign
 */
export async function DELETE(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized - only organization admins can unassign craftsmen' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id: objectId, craftsmanId } = resolvedParams

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Get object assignment
    const { data: assignment } = await supabaseAdmin
      .from('object_assignments')
      .select('*')
      .eq('object_id', objectId)
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    // Verify user's org is the TECHNICAL organization for this object
    if (!orgIds.includes(assignment.tech_org_id)) {
      return NextResponse.json(
        { error: 'Only the technical organization can unassign craftsmen from this object' },
        { status: 403 }
      )
    }

    // Delete the assignment
    const { error } = await supabaseAdmin
      .from('object_craftsmen')
      .delete()
      .eq('object_id', objectId)
      .eq('craftsman_id', craftsmanId)

    if (error) {
      console.error('Error unassigning craftsman:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Craftsman unassigned successfully'
    })
  } catch (error) {
    console.error('Unassign craftsman error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
