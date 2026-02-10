import { NextResponse } from 'next/server'
import { pollCapmoTickets } from '@/lib/integrations/capmo/poll'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    const secretHeader = request.headers.get('x-cron-secret')
    if (!secretHeader || secretHeader !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await pollCapmoTickets()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Capmo poll error:', error)
    return NextResponse.json(
      { error: 'An error occurred', details: error.message },
      { status: 500 }
    )
  }
}
