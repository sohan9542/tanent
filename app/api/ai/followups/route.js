import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { isRateLimited } from '@/lib/rate-limit'
import { evaluateAnswer } from '@/lib/answer-validation'

/**
 * Legacy route handler - maintained for backward compatibility
 * 
 * NOTE: New code should use:
 * - POST /api/ai/followups/evaluate for answer evaluation
 * - POST /api/ai/followups/next for generating next questions
 * 
 * This route handles both actions via body.action parameter or evaluateAnswer flag
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
    const { 
      action,
      category, 
      description, 
      locationDetails, 
      conversationHistory, 
      lastAnswer, 
      lastQuestion, 
      evaluateAnswer: shouldEvaluate, 
      lastQuestionType 
    } = body

    // Handle evaluate action
    if (action === 'evaluate' || shouldEvaluate) {
      if (!lastAnswer || typeof lastAnswer !== 'string') {
        return NextResponse.json({ error: 'lastAnswer is required' }, { status: 400 })
      }

      // Try to infer questionType from conversationHistory if not provided
      let questionType = lastQuestionType
      if (!questionType && conversationHistory && conversationHistory.length > 0) {
        const lastItem = conversationHistory[conversationHistory.length - 1]
        questionType = lastItem?.questionType || 'timing' // Default fallback
      }
      
      if (!questionType) {
        questionType = 'timing' // Default fallback
      }

      const result = evaluateAnswer(lastAnswer, questionType)
      
      console.log(`[API] Legacy route - Evaluating answer: "${lastAnswer.substring(0, 50)}..." - Type: ${questionType}, Sufficient: ${result.isSufficient}`)
      
      return NextResponse.json({
        isSufficient: result.isSufficient,
        reason: result.reason,
        shouldRephrase: false
      })
    }

    // Handle next action (generate next question)
    // Validate input
    if (!category || !description || typeof category !== 'string' || typeof description !== 'string') {
      return NextResponse.json({ error: 'Category and description are required' }, { status: 400 })
    }

    if (description.trim().length < 10) {
      return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 })
    }

    // For next question generation, delegate to the new endpoint handler
    // Import the next route module and call its POST handler
    const nextRouteModule = await import('./next/route.js')
    
    // Create a new request object for the next handler
    const url = new URL(request.url)
    url.pathname = url.pathname.replace(/\/followups\/?$/, '/followups/next')
    
    const nextRequest = new Request(url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        category,
        description,
        locationDetails: locationDetails || '',
        conversationHistory: conversationHistory || []
      })
    })
    
    // Call the next route's POST handler
    return await nextRouteModule.POST(nextRequest)
  } catch (error) {
    console.error('AI followups error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
