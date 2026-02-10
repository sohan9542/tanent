import { NextResponse } from 'next/server'
import { pollCapmoTickets } from '@/lib/integrations/capmo/poll'

/**
 * Auto-poll endpoint - called automatically by client-side provider
 * This runs whenever the app is active, regardless of user authentication
 * Safe because it's only accessible from same origin (default CORS behavior)
 */
export async function POST(request) {
  try {
    // Call the poll function directly
    // This endpoint is automatically called by the client-side provider
    // No authentication needed - it's an internal endpoint
    const result = await pollCapmoTickets()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Capmo auto-poll error:', error)
    return NextResponse.json(
      { error: 'An error occurred', details: error.message },
      { status: 500 }
    )
  }
}
