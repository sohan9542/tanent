import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCurrentStaffUser, canAccessTicket, getUserOrganizations } from '@/lib/staff-auth'
import { getCurrentPlatformUser } from '@/lib/platform-auth'
import PDFDocument from 'pdfkit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tickets/[id]/pdf - Generate PDF report for a ticket
 */
export async function GET(request, { params }) {
  try {
    const { id } = params

    // Check authorization - don't use requireAdminAuth() as it redirects
    const platformUser = await getCurrentPlatformUser()
    const isPlatformAdmin = platformUser?.role === 'platform_admin'
    const staffUser = await getCurrentStaffUser()

    if (!platformUser && !staffUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get ticket with all related data
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        tenant:tenants(id, tenant_id, first_name, last_name, email, phone, building_name, unit_number),
        object:objects(id, name, address, street, zip, city)
      `)
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check access
    if (!isPlatformAdmin && staffUser) {
      const canAccess = await canAccessTicket(staffUser, ticket)
      if (!canAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Get activity logs
    const { data: activityLogs } = await supabaseAdmin
      .from('ticket_activity_logs')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Get branding logos for the user's organization
    let targetOrgId = null
    if (staffUser) {
      // Organization user - get their organization
      const organizations = getUserOrganizations(staffUser)
      if (organizations.length > 0) {
        targetOrgId = organizations[0].id
      }
    }
    // Platform admin can use global logos (null org_id) or specific org if needed

    let logoQuery = supabaseAdmin
      .from('branding_logos')
      .select('*')

    if (targetOrgId) {
      logoQuery = logoQuery.eq('organization_id', targetOrgId)
    } else {
      // Platform admin - use global logos (null organization_id)
      logoQuery = logoQuery.is('organization_id', null)
    }

    const { data: logos } = await logoQuery

    const logoMap = {}
    if (logos) {
      logos.forEach(logo => {
        logoMap[logo.logo_type] = logo.logo_url || ''
      })
    }

    // Helper function to fetch image as buffer
    const fetchImageBuffer = async (url) => {
      if (!url || !url.trim()) return null
      try {
        const response = await fetch(url)
        if (!response.ok) return null
        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
      } catch (err) {
        console.warn('Failed to fetch image:', url, err.message)
        return null
      }
    }

    // Fetch logo images as buffers
    const logoBuffers = {}
    if (logoMap.owner) {
      logoBuffers.owner = await fetchImageBuffer(logoMap.owner)
    }
    if (logoMap.technical_partner) {
      logoBuffers.technical_partner = await fetchImageBuffer(logoMap.technical_partner)
    }
    if (logoMap.warranty_partner) {
      logoBuffers.warranty_partner = await fetchImageBuffer(logoMap.warranty_partner)
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 })
    const chunks = []

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('error', (err) => {
      console.error('PDF stream error:', err)
    })

    // Header with logos
    doc.fontSize(20).text('Ticket Report', { align: 'center' })
    doc.moveDown()

    // Logos row (if available)
    const logoY = doc.y
    const hasLogos = logoBuffers.owner || logoBuffers.technical_partner || logoBuffers.warranty_partner
    if (hasLogos) {
      doc.fontSize(10)
      let logoX = 50
      
      if (logoBuffers.owner) {
        try {
          doc.image(logoBuffers.owner, logoX, logoY, { width: 50, height: 50, fit: [50, 50] })
        } catch (err) {
          console.warn('Failed to add owner logo to PDF:', err.message)
        }
        logoX += 120
      }
      if (logoBuffers.technical_partner) {
        try {
          doc.image(logoBuffers.technical_partner, logoX, logoY, { width: 50, height: 50, fit: [50, 50] })
        } catch (err) {
          console.warn('Failed to add technical partner logo to PDF:', err.message)
        }
        logoX += 120
      }
      if (logoBuffers.warranty_partner) {
        try {
          doc.image(logoBuffers.warranty_partner, logoX, logoY, { width: 50, height: 50, fit: [50, 50] })
        } catch (err) {
          console.warn('Failed to add warranty partner logo to PDF:', err.message)
        }
      }
      doc.y = logoY + 60
      doc.moveDown(2)
    }

    // Ticket Summary
    doc.fontSize(16).text('Ticket Summary', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10)

    const summaryData = [
      ['Ticket ID', ticket.id],
      ['Title', ticket.title || 'N/A'],
      ['Category', ticket.category || 'N/A'],
      ['Status', ticket.status || 'N/A'],
      ['Warranty Flag', ticket.warranty_flag ? 'Yes' : 'No'],
      ['Urgency', ticket.urgency || 'N/A'],
      ['Location Details', ticket.location_details || 'N/A'],
      ['Created Date', new Date(ticket.created_at).toLocaleString()],
      ['Last Updated', new Date(ticket.updated_at).toLocaleString()],
      ticket.resolved_at ? ['Resolved Date', new Date(ticket.resolved_at).toLocaleString()] : null
    ].filter(Boolean)

    summaryData.forEach(([label, value]) => {
      doc.text(`${label}:`, { continued: true, width: 150 })
      doc.text(String(value || 'N/A'), { width: 300 })
      doc.moveDown(0.3)
    })

    doc.moveDown()

    // Object/Location Information
    if (ticket.object) {
      doc.fontSize(14).text('Location Information', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)
      doc.text(`Name: ${ticket.object.name || 'N/A'}`)
      if (ticket.object.address) doc.text(`Address: ${ticket.object.address}`)
      if (ticket.object.street) doc.text(`Street: ${ticket.object.street}`)
      if (ticket.object.zip) doc.text(`ZIP: ${ticket.object.zip}`)
      if (ticket.object.city) doc.text(`City: ${ticket.object.city}`)
      doc.moveDown()
    }

    // Tenant Information
    if (ticket.tenant) {
      doc.fontSize(14).text('Tenant Information', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)
      doc.text(`Name: ${ticket.tenant.first_name || ''} ${ticket.tenant.last_name || ''}`)
      if (ticket.tenant.email) doc.text(`Email: ${ticket.tenant.email}`)
      if (ticket.tenant.phone) doc.text(`Phone: ${ticket.tenant.phone}`)
      if (ticket.tenant.unit_number) doc.text(`Unit: ${ticket.tenant.unit_number}`)
      doc.moveDown()
    }

    // Description
    if (ticket.description) {
      doc.fontSize(14).text('Description', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)
      doc.text(ticket.description, { align: 'left' })
      doc.moveDown()
    }

    // Activity Log Summary
    if (activityLogs && activityLogs.length > 0) {
      doc.fontSize(14).text('Activity Log Summary', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)

      activityLogs.slice(0, 20).forEach((log, index) => {
        const actionType = log.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const timestamp = new Date(log.created_at).toLocaleString()
        doc.text(`${index + 1}. ${actionType} - ${log.admin_email} - ${timestamp}`)
        if (log.action_details && Object.keys(log.action_details).length > 0) {
          const details = JSON.stringify(log.action_details, null, 2)
          doc.fontSize(8).text(details, { indent: 20 })
          doc.fontSize(10)
        }
        doc.moveDown(0.3)
      })
    }

    // Capmo Information (if available)
    if (ticket.capmo_ticket_id) {
      doc.addPage()
      doc.fontSize(14).text('Capmo Integration', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)
      doc.text(`Capmo Ticket ID: ${ticket.capmo_ticket_id}`)
      if (ticket.capmo_status) doc.text(`Capmo Status: ${ticket.capmo_status}`)
      if (ticket.capmo_last_synced_at) {
        doc.text(`Last Synced: ${new Date(ticket.capmo_last_synced_at).toLocaleString()}`)
      }
    }

    // End PDF generation
    doc.end()

    // Wait for PDF to be generated
    await new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve()
      })
      doc.on('error', (err) => {
        reject(err)
      })
      
      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('PDF generation timeout'))
      }, 30000)
    })

    const pdfBuffer = Buffer.concat(chunks)
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty')
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${ticket.id}-report.pdf"`
      }
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF report',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
