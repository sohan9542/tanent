import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/org/logo/get?id={organizationId}
 * Public endpoint to get organization logo URL
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('id')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select('logo_url')
      .eq('id', organizationId)
      .single()

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      logoUrl: organization.logo_url || null
    })
  } catch (error) {
    console.error('Get logo error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
