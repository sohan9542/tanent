import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getCurrentTenant } from '@/lib/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/defect-locations - Get all defect location labels
 * Accessible to admins and tenants (for defect reporting)
 */
export async function GET(request) {
  try {
    // Check authorization - allow tenants, platform users, and admins
    const platformUser = await getCurrentPlatformUser()
    const legacyAdmin = await getCurrentAdmin()
    const tenant = await getCurrentTenant()

    // Allow access to anyone (tenants need this for reporting defects)
    // No auth check needed for GET - location labels are public data

    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('include_deleted') === 'true'

    let query = supabaseAdmin
      .from('defect_location_labels')
      .select('*')
      .order('display_order', { ascending: true })
      .order('label', { ascending: true })

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data: locations, error } = await query

    if (error) {
      console.error('Error fetching defect locations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      locations: locations || []
    })
  } catch (error) {
    console.error('Get defect locations error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/defect-locations - Create a new defect location label
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
    const { label, display_order } = body

    if (!label || !label.trim()) {
      return NextResponse.json(
        { error: 'Label is required' },
        { status: 400 }
      )
    }

    const { data: location, error } = await supabaseAdmin
      .from('defect_location_labels')
      .insert({
        label: label.trim(),
        display_order: display_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating defect location:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A location with this label already exists' },
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
      message: 'Location label created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Create defect location error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
