import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteAdminSession, getAdminSessionCookieName } from '@/lib/auth/admin-session'

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(getAdminSessionCookieName())?.value

    if (sessionToken) {
      await deleteAdminSession(sessionToken)
    }

    // Clear cookie
    cookieStore.delete(getAdminSessionCookieName())

    // Redirect to login page
    return NextResponse.redirect(new URL('/admin/login', request.url))
  } catch (error) {
    console.error('Admin logout error:', error)
    // Even on error, redirect to login
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
}

