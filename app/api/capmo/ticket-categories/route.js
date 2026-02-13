import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { listTicketCategories } from '@/lib/integrations/capmo/client'

/**
 * GET /api/capmo/ticket-categories
 * Fetches ticket categories from Capmo for the current tenant's object
 */
export async function GET(request) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get object_id from tenant
    const objectId = tenant.object_id

    if (!objectId) {
      return NextResponse.json({ 
        error: 'Tenant does not have an object assigned',
        categories: []
      }, { status: 400 })
    }

    // Get object to find capmo_project_id
    const { data: object, error: objectError } = await supabaseAdmin
      .from('objects')
      .select('id, capmo_project_id')
      .eq('id', objectId)
      .single()

    if (objectError || !object) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 })
    }

    if (!object.capmo_project_id) {
      return NextResponse.json({ 
        error: 'Object does not have a Capmo project ID mapped',
        categories: []
      }, { status: 400 })
    }

    // Fetch categories from Capmo
    try {
      const capmoResponse = await listTicketCategories(object.capmo_project_id)
      
      // Extract items from Capmo response
      const categories = (capmoResponse?.data?.items || []).map(item => ({
        id: item.id,
        name: item.name
      }))

      return NextResponse.json({
        categories
      })
    } catch (capmoError) {
      console.error('Capmo API error:', capmoError)
      return NextResponse.json({
        error: 'Failed to fetch categories from Capmo',
        categories: []
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Ticket categories error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
