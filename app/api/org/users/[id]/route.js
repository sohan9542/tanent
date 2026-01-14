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

export async function GET(request, { params }) {
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

    const orgId = organizations[0].id
    const { id } = params

    // Get user membership in this organization
    const { data: membership, error } = await supabaseAdmin
      .from('organization_memberships')
      .select(`
        *,
        user:platform_users(id, name, email, is_active, auth_user_id)
      `)
      .eq('user_id', id)
      .eq('organization_id', orgId)
      .single()

    if (error || !membership) {
      return NextResponse.json(
        { error: 'User not found in organization' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role,
      isActive: membership.user.is_active,
      membershipId: membership.id
    })
  } catch (error) {
    console.error('Get org user error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
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
    const { id } = params
    const body = await request.json()
    const { email, name, password, role, isActive } = body

    // Validate
    if (!email || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and role are required' },
        { status: 400 }
      )
    }

    if (!['org_admin', 'org_staff'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be org_admin or org_staff' },
        { status: 400 }
      )
    }

    // Get existing membership
    const { data: existingMembership } = await supabaseAdmin
      .from('organization_memberships')
      .select(`
        *,
        user:platform_users(id, email, auth_user_id)
      `)
      .eq('user_id', id)
      .eq('organization_id', orgId)
      .single()

    if (!existingMembership) {
      return NextResponse.json(
        { success: false, error: 'User not found in organization' },
        { status: 404 }
      )
    }

    // Check if email conflicts (if changed)
    if (email.trim() !== existingMembership.user.email) {
      const { data: conflict } = await supabaseAdmin
        .from('platform_users')
        .select('id')
        .eq('email', email.trim())
        .neq('id', id)
        .single()

      if (conflict) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Update platform_users record
    const updateData = {
      email: email.trim(),
      name: name.trim(),
      is_active: isActive !== undefined ? isActive : true
    }

    const { data: platformUser, error: platformError } = await supabaseAdmin
      .from('platform_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (platformError) {
      throw platformError
    }

    // Update organization_memberships role
    const { error: membershipError } = await supabaseAdmin
      .from('organization_memberships')
      .update({ role: role })
      .eq('id', existingMembership.id)

    if (membershipError) {
      throw membershipError
    }

    // Update email in Supabase Auth if changed
    if (email.trim() !== existingMembership.user.email) {
      await supabaseAdminClient.auth.admin.updateUserById(existingMembership.user.auth_user_id, {
        email: email.trim()
      })
    }

    // Update password if provided
    if (password && password.length >= 6) {
      await supabaseAdminClient.auth.admin.updateUserById(existingMembership.user.auth_user_id, {
        password: password
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: platformUser.id,
        email: platformUser.email,
        name: platformUser.name,
        role: role,
        isActive: platformUser.is_active
      }
    })
  } catch (error) {
    console.error('Update org user error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
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
    const { id } = params

    // Get membership
    const { data: membership } = await supabaseAdmin
      .from('organization_memberships')
      .select('id, user:platform_users(auth_user_id)')
      .eq('user_id', id)
      .eq('organization_id', orgId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'User not found in organization' },
        { status: 404 }
      )
    }

    // Delete organization_memberships (this will cascade delete object_roles via trigger)
    const { error } = await supabaseAdmin
      .from('organization_memberships')
      .delete()
      .eq('id', membership.id)

    if (error) {
      throw error
    }

    // Check if user has other organization memberships
    const { data: otherMemberships } = await supabaseAdmin
      .from('organization_memberships')
      .select('id')
      .eq('user_id', id)
      .limit(1)

    // If no other memberships, delete platform_users and auth user
    if (!otherMemberships || otherMemberships.length === 0) {
      await supabaseAdmin.from('platform_users').delete().eq('id', id)
      await supabaseAdminClient.auth.admin.deleteUser(membership.user.auth_user_id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete org user error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the user' },
      { status: 500 }
    )
  }
}
