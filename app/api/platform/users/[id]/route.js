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

export async function GET(request, { params }) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = params

    const { data: user, error } = await supabaseAdmin
      .from('platform_users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    })
  } catch (error) {
    console.error('Get platform user error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
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

    if (!['platform_admin', 'platform_staff'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be platform_admin or platform_staff' },
        { status: 400 }
      )
    }

    // Get existing user
    const { data: existing } = await supabaseAdmin
      .from('platform_users')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email conflicts (if changed)
    if (email.trim() !== existing.email) {
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
      role: role,
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

    // Update email in Supabase Auth if changed
    if (email.trim() !== existing.email) {
      await supabaseAdminClient.auth.admin.updateUserById(existing.auth_user_id, {
        email: email.trim()
      })
    }

    // Update password if provided
    if (password && password.length >= 6) {
      await supabaseAdminClient.auth.admin.updateUserById(existing.auth_user_id, {
        password: password
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: platformUser.id,
        email: platformUser.email,
        name: platformUser.name,
        role: platformUser.role,
        isActive: platformUser.is_active,
        updatedAt: platformUser.updated_at
      }
    })
  } catch (error) {
    console.error('Update platform user error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = params

    // Get user to get auth_user_id
    const { data: user } = await supabaseAdmin
      .from('platform_users')
      .select('auth_user_id')
      .eq('id', id)
      .single()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete platform_users record (cascade will handle related data)
    const { error } = await supabaseAdmin
      .from('platform_users')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Delete auth user
    await supabaseAdminClient.auth.admin.deleteUser(user.auth_user_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete platform user error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while deleting the user' },
      { status: 500 }
    )
  }
}
