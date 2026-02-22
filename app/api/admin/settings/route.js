import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/middleware-admin'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import { getCurrentAdminForLogging } from '@/lib/admin-activity-log'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings - Get all app settings
 */
export async function GET(request) {
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

    const { data: settings, error } = await supabaseAdmin
      .from('app_settings')
      .select('*')
      .order('setting_key', { ascending: true })

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Convert to object format for easier access
    const settingsObj = {}
    if (settings) {
      settings.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value
      })
    }

    return NextResponse.json({
      settings: settingsObj
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/settings - Update app settings
 */
export async function PATCH(request) {
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
    const { capmo_enabled, email_handoff_recipients } = body

    const adminInfo = await getCurrentAdminForLogging()
    const updates = []

    // Update Capmo enabled setting
    if (capmo_enabled !== undefined) {
      const { error: capmoError } = await supabaseAdmin
        .from('app_settings')
        .update({
          setting_value: { enabled: Boolean(capmo_enabled) },
          updated_by: adminInfo?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'capmo_enabled')

      if (capmoError) {
        console.error('Error updating capmo_enabled:', capmoError)
        return NextResponse.json(
          { error: 'Failed to update Capmo setting' },
          { status: 500 }
        )
      }
      updates.push('capmo_enabled')
    }

    // Update email recipients
    if (email_handoff_recipients !== undefined) {
      if (typeof email_handoff_recipients !== 'object') {
        return NextResponse.json(
          { error: 'email_handoff_recipients must be an object with contractor and warranty_manager fields' },
          { status: 400 }
        )
      }

      const { error: emailError } = await supabaseAdmin
        .from('app_settings')
        .update({
          setting_value: {
            contractor: email_handoff_recipients.contractor || '',
            warranty_manager: email_handoff_recipients.warranty_manager || ''
          },
          updated_by: adminInfo?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'email_handoff_recipients')

      if (emailError) {
        console.error('Error updating email_handoff_recipients:', emailError)
        return NextResponse.json(
          { error: 'Failed to update email recipients' },
          { status: 500 }
        )
      }
      updates.push('email_handoff_recipients')
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No settings to update' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Settings updated: ${updates.join(', ')}`,
      updated: updates
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
