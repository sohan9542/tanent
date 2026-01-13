import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession, getSessionCookieName } from '@/lib/auth/session'

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(getSessionCookieName())?.value

    if (sessionToken) {
      await deleteSession(sessionToken)
    }

    // Clear cookie
    cookieStore.delete(getSessionCookieName())

    // Return success response (client will handle redirect)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    // Even on error, return success so client can redirect
    return NextResponse.json({ success: true })
  }
}


