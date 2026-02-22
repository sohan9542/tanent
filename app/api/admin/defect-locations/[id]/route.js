import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/defect-locations/[id] - Get a single defect location label
 */
export async function GET(request, { params }) {
  try {
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()

    if (!platformUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    const { data: location, error } = await supabaseAdmin
      .from('defect_location_labels')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ location })
  } catch (error) {
    console.error('Get defect location error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/defect-locations/[id] - Update a defect location label
 */
export async function PATCH(request, { params }) {
  try {
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()

    if (!platformUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { label, display_order } = body

    const updateData = {}
    if (label !== undefined) {
      if (!label || !label.trim()) {
        return NextResponse.json(
          { error: 'Label cannot be empty' },
          { status: 400 }
        )
      }
      updateData.label = label.trim()
    }
    if (display_order !== undefined) {
      updateData.display_order = display_order
    }

    const { data: location, error } = await supabaseAdmin
      .from('defect_location_labels')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating defect location:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A location with this label already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      location,
      message: 'Location label updated successfully'
    })
  } catch (error) {
    console.error('Update defect location error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/defect-locations/[id] - Soft delete a defect location label
 */
export async function DELETE(request, { params }) {
  try {
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()

    if (!platformUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Soft delete
    const { data: location, error } = await supabaseAdmin
      .from('defect_location_labels')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting defect location:', error)
      return NextResponse.json(
        { error: 'Failed to delete location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Location label deleted successfully'
    })
  } catch (error) {
    console.error('Delete defect location error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
