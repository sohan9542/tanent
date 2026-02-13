import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { isRateLimited } from '@/lib/rate-limit'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MAX_TOKENS = 120
const MODEL = 'gpt-4o-mini'

/**
 * Question types in order of priority
 */
const QUESTION_TYPES = ['timing', 'severity', 'impact', 'frequency']
const REQUIRED_SUFFICIENT_ANSWERS = 4

/**
 * Determine which question type to ask next based on conversation history
 * @param {Array} conversationHistory - Array of { question, questionType, answer, insufficient }
 * @returns {string|null} - Next question type or null if all covered
 */
function getNextQuestionType(conversationHistory) {
  // Count sufficient answers per type
  const sufficientByType = {
    timing: 0,
    severity: 0,
    impact: 0,
    frequency: 0
  }
  
  conversationHistory.forEach(item => {
    if (item.questionType && !item.insufficient) {
      if (sufficientByType.hasOwnProperty(item.questionType)) {
        sufficientByType[item.questionType]++
      }
    }
  })
  
  // Check if we have enough sufficient answers total
  const totalSufficient = Object.values(sufficientByType).reduce((sum, count) => sum + count, 0)
  if (totalSufficient >= REQUIRED_SUFFICIENT_ANSWERS) {
    return null
  }
  
  // Find first type that doesn't have a sufficient answer yet
  for (const type of QUESTION_TYPES) {
    if (sufficientByType[type] === 0) {
      return type
    }
  }
  
  // All types have at least one answer, but we need more - ask the first type again
  // (This shouldn't happen if we're tracking correctly, but handle edge case)
  return QUESTION_TYPES[0]
}

/**
 * Check if we should re-ask the last question
 * @param {Array} conversationHistory - Array of conversation items
 * @returns {{shouldReAsk: boolean, question?: string, questionType?: string, retryMessage?: string}} - Re-ask info
 */
function shouldReAskLastQuestion(conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return { shouldReAsk: false }
  }
  
  const lastItem = conversationHistory[conversationHistory.length - 1]
  if (lastItem.insufficient && lastItem.question && lastItem.questionType) {
    return {
      shouldReAsk: true,
      question: lastItem.question,
      questionType: lastItem.questionType,
      retryMessage: lastItem.retryMessage || 'Please answer clearly.'
    }
  }
  
  return { shouldReAsk: false }
}

/**
 * Generate a single AI follow-up question based on conversation history
 * ChatGPT-like friendly and clear questions
 * @param {string} category - Defect category
 * @param {string} description - Initial description
 * @param {string} locationDetails - Location details
 * @param {Array} conversationHistory - Array of { question, questionType, answer, insufficient }
 * @param {string} questionType - The question type to generate
 * @returns {Promise<{question: string|null, questionType: string|null, isComplete: boolean}>}
 */
async function generateNextQuestion(category, description, locationDetails, conversationHistory, questionType) {
  if (!OPENAI_API_KEY) {
    return { question: null, questionType: null, isComplete: true }
  }

  try {
    // Build conversation context (only sufficient answers)
    let conversationContext = ''
    const sufficientAnswers = conversationHistory.filter(item => !item.insufficient)
    if (sufficientAnswers.length > 0) {
      conversationContext = '\n\nWhat we know so far:\n'
      sufficientAnswers.forEach((item, index) => {
        conversationContext += `- ${item.question} → ${item.answer}\n`
      })
      conversationContext += '\n'
    }
    
    const locationContext = locationDetails ? `Location: ${locationDetails}\n` : ''
    
    // Map question type to natural description (avoid technical labels)
    const typeHints = {
      timing: 'when this started or when it happens',
      severity: 'how serious or bad this issue is',
      impact: 'what happens or what problems this causes',
      frequency: 'how often this occurs'
    }
    
    const typeHint = typeHints[questionType] || questionType
    
    const prompt = `You are a friendly and helpful assistant helping someone report a property defect. Ask ONE clear, simple question.

Defect Category: "${category}"
${locationContext}Initial Description: "${description}"${conversationContext}

Ask ONE friendly question about ${typeHint}. 

Guidelines:
- Use simple, everyday words
- Be conversational and friendly (like ChatGPT)
- Ask ONE question only
- Make it easy to answer
- Don't use technical jargon
- Don't mention "severity", "impact", "frequency" - just ask naturally
- Keep it short and clear

Return JSON only: {"question": "Your friendly question here?"}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Return valid JSON only: {"question": "..."}'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.8, // Slightly higher for more natural, friendly questions
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text())
      return { question: null, questionType: null, isComplete: true }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return { question: null, questionType: null, isComplete: true }
    }

    try {
      let jsonStr = content
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
      
      const result = JSON.parse(jsonStr)
      const question = result.question?.trim() || null
      
      return {
        question,
        questionType: question ? questionType : null,
        isComplete: false
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      return { question: null, questionType: null, isComplete: true }
    }
  } catch (error) {
    console.error('OpenAI API request error:', error)
    return { question: null, questionType: null, isComplete: true }
  }
}

/**
 * POST /api/ai/followups/next
 * Generates the next question in the follow-up flow
 * 
 * Request body:
 * {
 *   category: string,
 *   description: string,
 *   locationDetails?: string,
 *   conversationHistory: Array<{question, questionType, answer, insufficient, createdAt?, retryMessage?}>
 * }
 * 
 * Response:
 * {
 *   question: string|null,
 *   questionType: "timing"|"severity"|"impact"|"frequency"|null,
 *   isComplete: boolean
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
    const { category, description, locationDetails, conversationHistory } = body

    // Validate input
    if (!category || !description || typeof category !== 'string' || typeof description !== 'string') {
      return NextResponse.json({ error: 'Category and description are required' }, { status: 400 })
    }

    if (description.trim().length < 10) {
      return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 })
    }

    const history = conversationHistory || []
    
    // Count sufficient answers
    const sufficientAnswersCount = history.filter(item => !item.insufficient).length
    
    // Stop when we have 4 sufficient answers
    if (sufficientAnswersCount >= REQUIRED_SUFFICIENT_ANSWERS) {
      return NextResponse.json({
        question: null,
        questionType: null,
        isComplete: true
      })
    }
    
    // Check if we should re-ask the last question
    const reAskInfo = shouldReAskLastQuestion(history)
    if (reAskInfo.shouldReAsk) {
      // Return the same question with retry message prepended
      const questionWithRetry = reAskInfo.retryMessage 
        ? `${reAskInfo.retryMessage} ${reAskInfo.question}`
        : reAskInfo.question
      
      return NextResponse.json({
        question: questionWithRetry,
        questionType: reAskInfo.questionType,
        isComplete: false
      })
    }
    
    // Determine next question type
    const nextQuestionType = getNextQuestionType(history)
    
    if (!nextQuestionType) {
      // All question types have sufficient answers
      return NextResponse.json({
        question: null,
        questionType: null,
        isComplete: true
      })
    }
    
    // Generate next question
    const location = locationDetails || ''
    const result = await generateNextQuestion(
      category.trim(), 
      description.trim(),
      location.trim(),
      history,
      nextQuestionType
    )

    return NextResponse.json({
      question: result.question,
      questionType: result.questionType,
      isComplete: result.isComplete
    })
  } catch (error) {
    console.error('AI followups error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
