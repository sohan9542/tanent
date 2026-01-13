/**
 * Verify reCAPTCHA token with Google API
 */
export async function verifyCaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY
  
  if (!secretKey) {
    console.warn('RECAPTCHA_SECRET_KEY not set, skipping verification')
    return true // Allow in development if not configured
  }

  if (!token || token === 'dev-token') {
    // In development, allow dev-token if secret key is not set
    if (!secretKey) {
      return true
    }
    return false
  }

  // Allow bypassed token (client-side time-based bypass)
  // This indicates the user recently passed reCAPTCHA and is within the bypass window
  if (token === 'bypassed') {
    return true
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`
    })

    const data = await response.json()
    
    // Log detailed error for debugging
    if (!data.success) {
      console.error('reCAPTCHA verification failed:', {
        success: data.success,
        'error-codes': data['error-codes'],
        challenge_ts: data.challenge_ts,
        hostname: data.hostname
      })
    }
    
    return data.success === true
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return false
  }
}


