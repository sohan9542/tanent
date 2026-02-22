import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/locations/[id] - Get a single location
 */
export async function GET(request, { params }) {
  try {
    const { id } = params

    // Check authorization
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()

    if (!platformUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: location, error } = await supabaseAdmin
      .from('objects')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      location
    })
  } catch (error) {
    console.error('Get location error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/locations/[id] - Update a location
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params

    // Check authorization
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()

    if (!platformUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, address, street, zip, city, object_id } = body

    // Build update payload
    const updatePayload = {}
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        )
      }
      updatePayload.name = name.trim()
    }
    if (address !== undefined) updatePayload.address = address || null
    if (street !== undefined) updatePayload.street = street || null
    if (zip !== undefined) updatePayload.zip = zip || null
    if (city !== undefined) updatePayload.city = city || null
    if (object_id !== undefined) updatePayload.object_id = object_id || null

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: location, error } = await supabaseAdmin
      .from('objects')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating location:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A location with this object_id already exists' },
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
      message: 'Location updated successfully'
    })
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/locations/[id] - Soft delete a location
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Check authorization
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()

    if (!platformUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if location is in use by tickets
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select('id')
      .or(`object_id.eq.${id},building_id.eq.${id}`)
      .limit(1)

    if (ticketsError) {
      console.error('Error checking ticket references:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to check location usage' },
        { status: 500 }
      )
    }

    if (tickets && tickets.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location: it is referenced by one or more tickets' },
        { status: 400 }
      )
    }

    // Check if location is in use by tenants
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .or(`building_id.eq.${id}`)
      .limit(1)

    if (tenantsError) {
      console.error('Error checking tenant references:', tenantsError)
      return NextResponse.json(
        { error: 'Failed to check location usage' },
        { status: 500 }
      )
    }

    if (tenants && tenants.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location: it is referenced by one or more tenants' },
        { status: 400 }
      )
    }

    // Soft delete
    const { data: location, error } = await supabaseAdmin
      .from('objects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting location:', error)
      return NextResponse.json(
        { error: 'Failed to delete location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Location deleted successfully',
      location
    })
  } catch (error) {
    console.error('Delete location error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
