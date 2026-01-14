import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/platform/organizations/[id] - Get organization details
 */
export async function GET(request, { params }) {
  try {
    await requirePlatformAdmin()

    const resolvedParams = await params
    const { id } = resolvedParams

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      organization
    })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get organization error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/platform/organizations/[id] - Delete organization
 */
export async function DELETE(request, { params }) {
  try {
    await requirePlatformAdmin()

    const resolvedParams = await params
    const { id } = resolvedParams

    // Check if organization has memberships
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', id)
      .limit(1)

    if (membershipError) {
      throw membershipError
    }

    if (memberships && memberships.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete organization with active memberships. Remove all users first.' },
        { status: 400 }
      )
    }

    // Check if organization is assigned to any objects
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('object_assignments')
      .select('id')
      .or(`owner_org_id.eq.${id},tech_org_id.eq.${id},warranty_org_id.eq.${id}`)
      .limit(1)

    if (assignmentError) {
      throw assignmentError
    }

    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete organization assigned to objects. Remove assignments first.' },
        { status: 400 }
      )
    }

    // Delete organization
    const { error } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Delete organization error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred while deleting the organization' },
      { status: 500 }
    )
  }
}
