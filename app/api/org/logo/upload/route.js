import { NextResponse } from 'next/server'
import { getCurrentStaffUser } from '@/lib/staff-auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { validateImageFile } from '@/lib/storage'

export async function POST(request) {
  try {
    const staffUser = await getCurrentStaffUser()
    if (!staffUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: membership } = await supabaseAdmin
      .from('organization_memberships')
      .select('organization_id, role')
      .eq('user_id', staffUser.id)
      .eq('role', 'org_admin')
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Only organization admins can upload logos' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const organizationId = membership.organization_id

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Generate filename: org-{org_id}-{timestamp}.{ext}
    const extension = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const filename = `org-${organizationId}-${timestamp}.${extension}`
    const filePath = `organization-logos/${filename}`

    // Upload to Supabase Storage (using ticket-images bucket or create org-logos bucket)
    // For now, using ticket-images bucket with a folder structure
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('ticket-images')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true // Replace if exists
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload logo: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('ticket-images')
      .getPublicUrl(filePath)

    const logoUrl = urlData.publicUrl

    // Delete old logo if exists
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('logo_url')
      .eq('id', organizationId)
      .single()

    if (orgData?.logo_url) {
      // Extract path from old URL and delete
      try {
        const oldPath = orgData.logo_url.split('/storage/v1/object/public/ticket-images/')[1]
        if (oldPath) {
          await supabaseAdmin.storage
            .from('ticket-images')
            .remove([oldPath])
        }
      } catch (err) {
        // Ignore delete errors
        console.warn('Failed to delete old logo:', err)
      }
    }

    // Update organization with new logo URL
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ logo_url: logoUrl })
      .eq('id', organizationId)
      .select('logo_url')
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update organization logo: ' + updateError.message },
        { status: 500 }
      )
    }

    // Verify the logo URL was saved
    if (!updatedOrg?.logo_url) {
      console.error('Logo URL not saved to database')
      return NextResponse.json(
        { error: 'Logo uploaded but failed to save URL to database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logoUrl: updatedOrg.logo_url
    })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
