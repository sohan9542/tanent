import { NextResponse } from 'next/server'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * DELETE /api/org/objects/[id]/roles/[roleId] - Remove object role
 */
export async function DELETE(request, { params }) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const { id: objectId, roleId } = resolvedParams

    const organizations = getUserOrganizations(staffUser)
    const orgIds = organizations.map(o => o.id)

    // Get the role to verify it belongs to org
    const { data: role, error: roleError } = await supabaseAdmin
      .from('object_roles')
      .select('*')
      .eq('id', roleId)
      .eq('object_id', objectId)
      .single()

    if (roleError || !role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Verify role's organization is user's organization
    if (!orgIds.includes(role.organization_id)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete role
    const { error } = await supabaseAdmin
      .from('object_roles')
      .delete()
      .eq('id', roleId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Delete role error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
