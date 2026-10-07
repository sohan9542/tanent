import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * POST /api/platform/auth/logout - Platform admin/staff logout
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set(name, value, options)
          },
          remove(name, options) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    await supabase.auth.signOut()

    // Get the origin from the request URL
    const url = new URL(request.url)
    const origin = url.origin

    // Redirect to login page
    return NextResponse.redirect(new URL('/platform/login', origin))
  } catch (error) {
    console.error('Platform logout error:', error)
    // Even on error, redirect to login page
    try {
      const url = new URL(request.url)
      const origin = url.origin
      return NextResponse.redirect(new URL('/platform/login', origin))
    } catch {
      // Fallback if URL parsing fails
      return NextResponse.redirect(new URL('/platform/login', 'http://localhost:3000'))
    }
  }
}
