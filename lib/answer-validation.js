/**
 * Answer validation utilities for AI follow-up Q&A flow
 * Deterministic checks for bad words and gibberish
 */

/**
 * Common profanity/bad words list
 */
const BAD_WORDS = [
  'fuck', 'shit', 'damn', 'ass', 'bitch', 'bastard', 'crap', 'hell',
  'piss', 'dick', 'cock', 'pussy', 'cunt', 'whore', 'slut', 'fag',
  'nigger', 'nigga', 'retard', 'idiot', 'stupid', 'moron', 'dumb'
]

/**
 * Check if answer contains bad words
 * @param {string} answer - The answer text to check
 * @returns {boolean} - True if bad words found
 */
export function containsBadWords(answer) {
  const lower = answer.toLowerCase()
  // Remove common punctuation/symbols for checking
  const cleaned = lower.replace(/[^a-z0-9\s]/g, ' ')
  const words = cleaned.split(/\s+/).filter(w => w.length > 0)
  
  // Create a Set for faster lookup
  const badWordsSet = new Set(BAD_WORDS)
  
  // Check for exact word matches only (whole words, not substrings)
  // This prevents false positives like "basis" matching "ass" or "class" matching "ass"
  for (const word of words) {
    if (badWordsSet.has(word)) {
      return true
    }
  }
  
  return false
}

/**
 * Simple deterministic gibberish detection
 * Returns true if answer is gibberish (symbols-only, numbers-only, random letters)
 * @param {string} answer - The answer text to check
 * @returns {boolean} - True if gibberish
 */
export function isGibberish(answer) {
  const trimmed = answer.trim()
  if (trimmed.length < 2) return true
  
  // Just symbols only (like "!@#$%^&*", "???", "!!!"))
  if (/^[^a-z0-9\s]{3,}$/i.test(trimmed)) return true
  
  // Random numbers only (like "99394329", "12345678")
  if (/^\d{6,}$/.test(trimmed)) return true
  
  // Random letters only, no spaces, no vowels (like "adsfdsafdsafas", "fdasfdsf")
  if (/^[a-z]{6,}$/i.test(trimmed) && !trimmed.match(/[aeiou]/i)) return true
  
  // Check for random letter sequences (no spaces, all letters, looks like gibberish)
  if (!trimmed.includes(' ') && trimmed.length >= 6 && /^[a-z]+$/i.test(trimmed)) {
    const vowelCount = (trimmed.match(/[aeiou]/gi) || []).length
    const vowelRatio = vowelCount / trimmed.length
    
    // If less than 30% vowels in 6+ chars, likely gibberish (like "fasdfads" = 2/8 = 25%)
    if (vowelRatio < 0.30) return true
    
    // Check for repeated character sequences (like "fas" appearing twice in "fasdfads")
    if (trimmed.length >= 6) {
      for (let len = 2; len <= Math.floor(trimmed.length / 2); len++) {
        for (let start = 0; start <= trimmed.length - len * 2; start++) {
          const pattern = trimmed.substring(start, start + len)
          const remaining = trimmed.substring(start + len)
          if (remaining.includes(pattern)) {
            // Found repeated pattern - likely gibberish
            return true
          }
        }
      }
    }
    
    // If very few vowels (less than 2) in 6+ chars, likely gibberish
    if (vowelCount < 2) return true
    
    // If no common English letter patterns (like consecutive consonants > 4)
    const consecutiveConsonants = trimmed.match(/[bcdfghjklmnpqrstvwxyz]{5,}/gi)
    if (consecutiveConsonants) return true
  }
  
  return false
}

/**
 * Deterministic pre-check before AI judge
 * Returns null if should proceed to AI, or result object if deterministic rejection
 * @param {string} answer - The answer text
 * @returns {null | {isSufficient: false, reason: string, retryMessage: string}}
 */
export function deterministicCheck(answer) {
  const trimmed = answer.trim()
  
  // Too short
  if (trimmed.length < 2) {
    return {
      isSufficient: false,
      reason: 'too_short',
      retryMessage: 'Please provide a more detailed answer.'
    }
  }
  
  // Check for bad words/profanity
  if (containsBadWords(trimmed)) {
    return {
      isSufficient: false,
      reason: 'abusive',
      retryMessage: 'Please use appropriate language in your response.'
    }
  }
  
  // Check for gibberish
  if (isGibberish(trimmed)) {
    return {
      isSufficient: false,
      reason: 'gibberish',
      retryMessage: 'Please answer in clear words, not random text or symbols.'
    }
  }
  
  // Passed deterministic checks - proceed to AI judge
  return null
}
