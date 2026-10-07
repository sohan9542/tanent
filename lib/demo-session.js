import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import {
  DEMO_ORG_USER,
  DEMO_PLATFORM_ADMIN,
  isDemoModeEnabled,
} from './demo-config'

export const DEMO_SESSION_COOKIE = 'tanent_demo_session'
const DEMO_SESSION_HOURS = 24

function getDemoSigningSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.DEMO_SESSION_SECRET ||
    'tanent-portfolio-demo-secret'
  )
}

function signPayload(payloadBase64) {
  return createHmac('sha256', getDemoSigningSecret())
    .update(payloadBase64)
    .digest('base64url')
}

export function createDemoSessionToken(kind = 'platform') {
  const user =
    kind === 'org'
      ? {
          id: DEMO_ORG_USER.id,
          email: DEMO_ORG_USER.email,
          name: DEMO_ORG_USER.name,
          role: null,
          orgRole: 'org_admin',
          organizationId: DEMO_ORG_USER.memberships[0].organization.id,
          organizationName: DEMO_ORG_USER.memberships[0].organization.name,
        }
      : {
          id: DEMO_PLATFORM_ADMIN.id,
          email: DEMO_PLATFORM_ADMIN.email,
          name: DEMO_PLATFORM_ADMIN.name,
          role: DEMO_PLATFORM_ADMIN.role,
        }

  const expiresAt = Date.now() + DEMO_SESSION_HOURS * 60 * 60 * 1000
  const payload = Buffer.from(
    JSON.stringify({
      kind,
      user,
      exp: expiresAt,
      isDemo: true,
    })
  ).toString('base64url')

  return `${payload}.${signPayload(payload)}`
}

export function verifyDemoSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null
  }

  const [payload, signature] = token.split('.')
  if (!payload || !signature) {
    return null
  }

  const expected = signPayload(payload)
  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.isDemo || !data?.exp || data.exp < Date.now()) {
      return null
    }
    return data
  } catch {
    return null
  }
}

export async function getDemoSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value
    return verifyDemoSessionToken(token)
  } catch {
    return null
  }
}

export function demoSessionCookieOptions(maxAgeSeconds = DEMO_SESSION_HOURS * 3600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export async function clearDemoSessionCookie() {
  try {
    const cookieStore = await cookies()
    cookieStore.set(DEMO_SESSION_COOKIE, '', {
      ...demoSessionCookieOptions(0),
      maxAge: 0,
    })
  } catch {
    // Ignore in contexts where cookies cannot be mutated
  }
}

export function getDemoPlatformUserFromSession(session) {
  if (!session || session.kind !== 'platform' || !session.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    is_active: true,
    isDemo: true,
  }
}

export function getDemoOrgUserFromSession(session) {
  if (!session || session.kind !== 'org' || !session.user) {
    return null
  }

  return {
    ...DEMO_ORG_USER,
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isDemo: true,
  }
}

/**
 * Whether demo login/session bypass is allowed.
 * Always allowed when DEMO_MODE is on; callers may also allow it after auth failures.
 */
export function canUseDemoBypass({ force = false } = {}) {
  return force || isDemoModeEnabled()
}

export function isSupabaseEnvConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
