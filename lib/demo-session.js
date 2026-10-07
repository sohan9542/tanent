import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { DEMO_ORG_USER, DEMO_PLATFORM_ADMIN, DEMO_TENANT } from './demo-config'

export const DEMO_COOKIE = 'tanent_static_demo'

function secret() {
  return process.env.SESSION_SECRET || 'tanent-static-demo-secret'
}

function sign(payloadB64) {
  return createHmac('sha256', secret()).update(payloadB64).digest('base64url')
}

export function createStaticDemoToken(kind) {
  const payload = Buffer.from(
    JSON.stringify({
      kind,
      isStaticDemo: true,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    })
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyStaticDemoToken(token) {
  if (!token || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const expected = sign(payload)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.isStaticDemo || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

export async function getStaticDemoSession() {
  try {
    const store = await cookies()
    return verifyStaticDemoToken(store.get(DEMO_COOKIE)?.value)
  } catch {
    return null
  }
}

export function demoCookieOptions(maxAge = 24 * 3600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  }
}

export function getStaticDemoPlatformUser() {
  return {
    id: DEMO_PLATFORM_ADMIN.id,
    email: DEMO_PLATFORM_ADMIN.email,
    name: DEMO_PLATFORM_ADMIN.name,
    role: DEMO_PLATFORM_ADMIN.role,
    is_active: true,
    isStaticDemo: true,
  }
}

export function getStaticDemoTenant() {
  return { ...DEMO_TENANT, isStaticDemo: true }
}

export function getStaticDemoOrgUser() {
  return {
    ...DEMO_ORG_USER,
    isStaticDemo: true,
  }
}
