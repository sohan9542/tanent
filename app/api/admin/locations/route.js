import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { logTicketActivity } from '@/lib/admin-activity-log'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/locations - Get all locations (objects)
 */
export async function GET(request) {
  try {
    // Check authorization - only platform admin can manage locations
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()

    if (!platformUser && !legacyAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('include_deleted') === 'true'

    let query = supabaseAdmin
      .from('objects')
      .select('*')
      .order('name', { ascending: true })

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data: locations, error } = await query

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      locations: locations || []
    })
  } catch (error) {
    console.error('Get locations error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/locations - Create a new location
 */
export async function POST(request) {
  try {
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

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const { data: location, error } = await supabaseAdmin
      .from('objects')
      .insert({
        name: name.trim(),
        address: address || null,
        street: street || null,
        zip: zip || null,
        city: city || null,
        object_id: object_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating location:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A location with this object_id already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create location' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      location,
      message: 'Location created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create location error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
