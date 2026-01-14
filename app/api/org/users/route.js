import { NextResponse } from 'next/server'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { isOrganizationAdmin, getUserOrganizations } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
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

/**
 * GET /api/org/users - Get users in organization
 */
export async function GET() {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const organizations = getUserOrganizations(staffUser)
    if (organizations.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    // Get users in the first organization (primary org)
    const orgId = organizations[0].id

    const { data: memberships, error } = await supabaseAdmin
      .from('organization_memberships')
      .select(`
        *,
        user:platform_users(id, name, email, is_active)
      `)
      .eq('organization_id', orgId)

    if (error) {
      throw error
    }

    const users = (memberships || []).map(m => ({
      ...m.user,
      membership_role: m.role,
      membership_id: m.id
    }))

    return NextResponse.json({
      users
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/org/users - Create organization user
 */
export async function POST(request) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser || !isOrganizationAdmin(staffUser)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const organizations = getUserOrganizations(staffUser)
    if (organizations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 400 }
      )
    }

    const orgId = organizations[0].id
    const body = await request.json()
    const { email, name, password, role } = body

    // Validate
    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, name, password, and role are required' },
        { status: 400 }
      )
    }

    if (!['org_admin', 'org_staff'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be org_admin or org_staff' },
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
      // Check if user is already in this organization
      const { data: existingMembership } = await supabaseAdmin
        .from('organization_memberships')
        .select('id')
        .eq('user_id', existing.id)
        .eq('organization_id', orgId)
        .single()

      if (existingMembership) {
        return NextResponse.json(
          { success: false, error: 'User is already in this organization' },
          { status: 400 }
        )
      }

      // User exists but not in org - add membership
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('organization_memberships')
        .insert({
          user_id: existing.id,
          organization_id: orgId,
          role: role
        })
        .select(`
          *,
          user:platform_users(id, name, email, is_active)
        `)
        .single()

      if (membershipError) {
        throw membershipError
      }

      return NextResponse.json({
        success: true,
        user: {
          ...membership.user,
          membership_role: membership.role,
          membership_id: membership.id
        }
      }, { status: 201 })
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

    // Step 2: Create platform_users record (with NULL role - not platform user)
    const { data: platformUser, error: platformError } = await supabaseAdmin
      .from('platform_users')
      .insert({
        auth_user_id: authData.user.id,
        email: email.trim(),
        name: name.trim(),
        role: null, // Organization users don't have platform roles
        is_active: true
      })
      .select()
      .single()

    if (platformError) {
      // Clean up auth user if platform_users creation failed
      await supabaseAdminClient.auth.admin.deleteUser(authData.user.id)
      
      console.error('Platform user error:', platformError)
      return NextResponse.json(
        { success: false, error: platformError.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    // Step 3: Create organization_memberships record
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .insert({
        user_id: platformUser.id,
        organization_id: orgId,
        role: role
      })
      .select(`
        *,
        user:platform_users(id, name, email, is_active)
      `)
      .single()

    if (membershipError) {
      // Clean up platform user and auth user
      await supabaseAdmin.from('platform_users').delete().eq('id', platformUser.id)
      await supabaseAdminClient.auth.admin.deleteUser(authData.user.id)
      
      console.error('Membership error:', membershipError)
      return NextResponse.json(
        { success: false, error: membershipError.message || 'Failed to add user to organization' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        ...membership.user,
        membership_role: membership.role,
        membership_id: membership.id
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create org user error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
