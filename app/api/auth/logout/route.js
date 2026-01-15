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

    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}


