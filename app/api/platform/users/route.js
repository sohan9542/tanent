import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create admin client for auth operations
const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request) {
  let user
  try {
    user = await requirePlatformAdmin()
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    if (user?.isStaticDemo) {
      return NextResponse.json({
        users: [],
        total: 0,
        page,
        limit,
        demo: true,
      })
    }

    let query = supabaseAdmin
      .from('platform_users')
      .select(`
        *,
        memberships:organization_memberships(
          role,
          organization:organizations(id, name)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data: users, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit
    })
  } catch (error) {
    console.error('Platform users list error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { email, name, password, role } = body

    // Validate
    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, name, password, and role are required' },
        { status: 400 }
      )
    }

    if (!['platform_admin', 'platform_staff'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be platform_admin or platform_staff' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('platform_users')
      .select('id')
      .eq('email', email.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdminClient.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { success: false, error: authError.message || 'Failed to create auth user' },
        { status: 400 }
      )
    }

    // Step 2: Create platform_users record
    const { data: platformUser, error: platformError } = await supabaseAdmin
      .from('platform_users')
      .insert({
        auth_user_id: authData.user.id,
        email: email.trim(),
        name: name.trim(),
        role: role,
        is_active: true
      })
      .select()
      .single()

    if (platformError) {
      // Clean up auth user if platform_users creation failed
      await supabaseAdminClient.auth.admin.deleteUser(authData.user.id)
      
      console.error('Platform user error:', platformError)
      return NextResponse.json(
        { success: false, error: platformError.message || 'Failed to create platform user' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: platformUser.id,
        email: platformUser.email,
        name: platformUser.name,
        role: platformUser.role,
        isActive: platformUser.is_active,
        createdAt: platformUser.created_at
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create platform user error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
