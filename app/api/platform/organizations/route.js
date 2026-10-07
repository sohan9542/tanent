import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/platform/organizations - List all organizations
 */
export async function GET() {
  try {
    await requirePlatformAdmin()

    const { data: organizations, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      organizations: organizations || []
    })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get organizations error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/platform/organizations - Create new organization
 */
export async function POST(request) {
  try {
    await requirePlatformAdmin()

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: name.trim()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      organization
    }, { status: 201 })
  } catch (error) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Create organization error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
