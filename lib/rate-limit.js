// Simple in-memory rate limiter for MVP
// In production, use Redis or a proper rate limiting service

const attempts = new Map()
const BLOCKED_IPS = new Map()

const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  BLOCK_DURATION_MS: 60 * 60 * 1000, // 1 hour
  MAX_FAILURES_FOR_BLOCK: 10
}

/**
 * Check if IP is rate limited
 */
export function isRateLimited(ip) {
  // Check if IP is blocked
  const blockInfo = BLOCKED_IPS.get(ip)
  if (blockInfo && blockInfo.expiresAt > Date.now()) {
    return {
      limited: true,
      retryAfter: Math.ceil((blockInfo.expiresAt - Date.now()) / 1000)
    }
  }

  // Check recent attempts
  const ipAttempts = attempts.get(ip) || []
  const now = Date.now()
  const recentAttempts = ipAttempts.filter(timestamp => now - timestamp < RATE_LIMIT.WINDOW_MS)

  if (recentAttempts.length >= RATE_LIMIT.MAX_ATTEMPTS) {
    return {
      limited: true,
      retryAfter: Math.ceil((RATE_LIMIT.WINDOW_MS - (now - recentAttempts[0])) / 1000)
    }
  }

  return { limited: false }
}

/**
 * Record a failed attempt
 */
export function recordFailedAttempt(ip) {
  const now = Date.now()
  const ipAttempts = attempts.get(ip) || []
  
  // Add current attempt
  ipAttempts.push(now)
  
  // Keep only recent attempts
  const recentAttempts = ipAttempts.filter(timestamp => now - timestamp < RATE_LIMIT.WINDOW_MS)
  attempts.set(ip, recentAttempts)

  // Check if should block IP
  if (recentAttempts.length >= RATE_LIMIT.MAX_FAILURES_FOR_BLOCK) {
    BLOCKED_IPS.set(ip, {
      expiresAt: now + RATE_LIMIT.BLOCK_DURATION_MS
    })
  }
}

/**
 * Clear attempts for IP (on successful login)
 */
export function clearAttempts(ip) {
  attempts.delete(ip)
  BLOCKED_IPS.delete(ip)
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanup() {
  const now = Date.now()
  
  // Clean attempts
  for (const [ip, ipAttempts] of attempts.entries()) {
    const recentAttempts = ipAttempts.filter(timestamp => now - timestamp < RATE_LIMIT.WINDOW_MS)
    if (recentAttempts.length === 0) {
      attempts.delete(ip)
    } else {
      attempts.set(ip, recentAttempts)
    }
  }

  // Clean blocked IPs
  for (const [ip, blockInfo] of BLOCKED_IPS.entries()) {
    if (blockInfo.expiresAt <= now) {
      BLOCKED_IPS.delete(ip)
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 5 * 60 * 1000)
}


