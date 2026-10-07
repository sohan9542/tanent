/**
 * reCAPTCHA is always treated as passed for this portfolio app.
 */
export async function verifyCaptcha(_token) {
  return true
}
