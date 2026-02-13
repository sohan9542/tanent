import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { isRateLimited } from '@/lib/rate-limit'
import { deterministicCheck } from '@/lib/answer-validation'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const JUDGE_MODEL = 'gpt-4o-mini'
const JUDGE_MAX_TOKENS = 150

/**
 * AI-based answer relevance judge
 * Evaluates if an answer is sufficient and relevant to the question
 * @param {Object} params
 * @param {string} params.category - Defect category
 * @param {string} params.description - Initial description
 * @param {string} params.locationDetails - Location details
 * @param {string} params.question - The question asked
 * @param {string} params.answer - The user's answer
 * @returns {Promise<{isSufficient: boolean, reason: string, retryMessage: string}>}
 */
async function evaluateAnswerWithAI({ category, description, locationDetails, question, answer }) {
  if (!OPENAI_API_KEY) {
    // Fallback if no API key
    return {
      isSufficient: answer.trim().length >= 3,
      reason: answer.trim().length < 3 ? 'too_short' : 'ok',
      retryMessage: answer.trim().length < 3 ? 'Please provide a more detailed answer.' : ''
    }
  }

  try {
    const locationContext = locationDetails ? `Location: ${locationDetails}\n` : ''
    
    const prompt = `You are a helpful assistant evaluating user answers in a property defect reporting conversation.

Defect Category: "${category}"
${locationContext}Initial Description: "${description}"

Question asked: "${question}"
User's answer: "${answer}"

Evaluate if the answer is sufficient:
- Short answers are FINE: "ok", "yes", "no", "yesterday", "daily", "severe", "4", "leaking", etc. => sufficient
- If answer does not address the question asked at all => insufficient
- If answer is abusive/profanity => insufficient (but this should be caught by deterministic checks)
- If answer is completely vague like "idk", "maybe", "nothing", "don't know" => insufficient
- If answer is okay even if short or not perfect grammar => sufficient
- Be lenient: accept any answer that seems to address the question, even if brief

Return JSON only with this exact schema:
{
  "isSufficient": true/false,
  "reason": "ok" | "too_short" | "not_relevant" | "unclear" | "abusive" | "gibberish",
  "retryMessage": "Short instruction to user (max 1 sentence, friendly tone)"
}

Examples:
- Answer: "yesterday" to "When did it start?" => {"isSufficient": true, "reason": "ok", "retryMessage": ""}
- Answer: "ok" => {"isSufficient": true, "reason": "ok", "retryMessage": ""}
- Answer: "yes" => {"isSufficient": true, "reason": "ok", "retryMessage": ""}
- Answer: "4" to "Rate severity 1-5" => {"isSufficient": true, "reason": "ok", "retryMessage": ""}
- Answer: "idk" => {"isSufficient": false, "reason": "unclear", "retryMessage": "Could you provide more details about this?"}
- Answer: "maybe" => {"isSufficient": false, "reason": "unclear", "retryMessage": "Please give a specific answer if possible."}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Return valid JSON only with isSufficient, reason, and retryMessage fields.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: JUDGE_MAX_TOKENS,
        temperature: 0,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text())
      // Fallback on API error - accept any non-empty answer
      return {
        isSufficient: answer.trim().length >= 1,
        reason: 'ok',
        retryMessage: ''
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return {
        isSufficient: answer.trim().length >= 1,
        reason: 'ok',
        retryMessage: ''
      }
    }

    try {
      let jsonStr = content
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
      
      const result = JSON.parse(jsonStr)
      
      return {
        isSufficient: result.isSufficient === true,
        reason: result.reason || 'ok',
        retryMessage: result.retryMessage || ''
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI judge response:', parseError)
      // Fallback on parse error
      return {
        isSufficient: answer.trim().length >= 1,
        reason: 'ok',
        retryMessage: ''
      }
    }
  } catch (error) {
    console.error('OpenAI judge API request error:', error)
    // Fallback on error
    return {
      isSufficient: answer.trim().length >= 3,
      reason: answer.trim().length < 3 ? 'too_short' : 'ok',
      retryMessage: answer.trim().length < 3 ? 'Please provide a more detailed answer.' : ''
    }
  }
}

/**
 * POST /api/ai/followups/evaluate
 * Evaluates if an answer is sufficient (valid + relevant)
 * 
 * Request body:
 * {
 *   category: string,
 *   description: string,
 *   locationDetails?: string,
 *   lastQuestion: string,
 *   lastAnswer: string
 * }
 * 
 * Response:
 * {
 *   isSufficient: boolean,
 *   reason?: "ok" | "too_short" | "not_relevant" | "unclear" | "abusive" | "gibberish",
 *   retryMessage?: string
 * }
 */
export async function POST(request) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const rateLimitCheck = isRateLimited(clientIp)
    if (rateLimitCheck.limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: { 'Retry-After': rateLimitCheck.retryAfter.toString() }
        }
      )
    }

    const body = await request.json()
    const { category, description, locationDetails, lastQuestion, lastAnswer } = body

    // Validate input
    if (!lastAnswer || typeof lastAnswer !== 'string') {
      return NextResponse.json({ error: 'lastAnswer is required' }, { status: 400 })
    }

    if (!lastQuestion || typeof lastQuestion !== 'string') {
      return NextResponse.json({ error: 'lastQuestion is required' }, { status: 400 })
    }

    if (!category || !description) {
      return NextResponse.json({ error: 'category and description are required' }, { status: 400 })
    }

    // Step 1: Deterministic checks (bad words, gibberish)
    const deterministicResult = deterministicCheck(lastAnswer)
    if (deterministicResult) {
      console.log(`[API] Deterministic rejection: "${lastAnswer.substring(0, 50)}..." - Reason: ${deterministicResult.reason}`)
      return NextResponse.json({
        isSufficient: false,
        reason: deterministicResult.reason,
        retryMessage: deterministicResult.retryMessage
      })
    }

    // Step 2: AI-based relevance judge
    const aiResult = await evaluateAnswerWithAI({
      category,
      description,
      locationDetails: locationDetails || '',
      question: lastQuestion,
      answer: lastAnswer
    })
    
    console.log(`[API] AI judge result: "${lastAnswer.substring(0, 50)}..." - Sufficient: ${aiResult.isSufficient}, Reason: ${aiResult.reason}`)
    
    return NextResponse.json({
      isSufficient: aiResult.isSufficient,
      reason: aiResult.reason,
      retryMessage: aiResult.retryMessage || ''
    })
  } catch (error) {
    console.error('Answer evaluation error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
