import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/platform/objects/[id] - Get object details
 */
export async function GET(request, { params }) {
  try {
    await requirePlatformAdmin()

    const resolvedParams = await params
    const { id } = resolvedParams

    // First get the object
    const { data: object, error: objectError } = await supabaseAdmin
      .from('objects')
      .select('*')
      .eq('id', id)
      .single()

    if (objectError || !object) {
      return NextResponse.json(
        { error: 'Object not found' },
        { status: 404 }
      )
    }

    // Then get the assignment with org details
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('object_assignments')
      .select(`
        *,
        owner_org:organizations!object_assignments_owner_org_id_fkey(id, name),
        tech_org:organizations!object_assignments_tech_org_id_fkey(id, name),
        warranty_org:organizations!object_assignments_warranty_org_id_fkey(id, name)
      `)
      .eq('object_id', id)
      .single()

    // If assignment doesn't exist (PGRST116), that's okay - return object with empty assignment array
    // If there's another error, log it but continue
    if (assignmentError && assignmentError.code !== 'PGRST116') {
      console.error('Error fetching assignment:', assignmentError)
    }

    const result = {
      ...object,
      assignment: assignment ? [assignment] : []
    }

    return NextResponse.json({
      object: result
    })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get object error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/platform/objects/[id] - Delete object
 */
export async function DELETE(request, { params }) {
  try {
    await requirePlatformAdmin()

    const resolvedParams = await params
    const { id } = resolvedParams

    // Check if object has tenants
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('object_id', id)
      .limit(1)

    if (tenantError) {
      throw tenantError
    }

    if (tenants && tenants.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete object with tenants. Remove all tenants first.' },
        { status: 400 }
      )
    }

    // Check if object has tickets
    const { data: tickets, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('id')
      .eq('object_id', id)
      .limit(1)

    if (ticketError) {
      throw ticketError
    }

    if (tickets && tickets.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete object with tickets. Resolve or delete all tickets first.' },
        { status: 400 }
      )
    }

    // Delete object (cascade will handle object_assignments and object_roles)
    const { error } = await supabaseAdmin
      .from('objects')
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
    console.error('Delete object error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred while deleting the object' },
      { status: 500 }
    )
  }
}
