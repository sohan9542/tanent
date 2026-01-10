import { NextResponse } from 'next/server'

export function middleware(request) {
  // Allow API routes and static files
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }

  // Allow login pages
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }

  // For tenant routes, check session cookie exists
  // Actual verification happens in the page/route handler
  if (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/tickets')
  ) {
    const sessionToken = request.cookies.get('tenant_session')
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // For admin routes (except login), check admin session cookie exists
  // Actual verification happens in the layout/route handler
  if (request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin/login') {
    const adminSessionToken = request.cookies.get('admin_session')
    if (!adminSessionToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}


