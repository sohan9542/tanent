import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/middleware'
import { isRateLimited } from '@/lib/rate-limit'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MAX_TOKENS = 200
const MODEL = 'gpt-3.5-turbo'

/**
 * Generate AI follow-up questions based on defect category and description
 */
async function generateFollowupQuestions(category, description) {
  if (!OPENAI_API_KEY) {
    // Graceful degradation: return empty array if no API key
    return []
  }

  try {
    const prompt = `You are a helpful assistant for a property management defect reporting system. 
Based on the defect category "${category}" and the following description, generate 2-5 concise, specific follow-up questions that would help gather better information about the issue.

Description: "${description}"

Return ONLY a JSON array of question strings, nothing else. Example format: ["Question 1?", "Question 2?", "Question 3?"]

Questions should be:
- Specific to the defect category
- Helpful for understanding the issue better
- Concise (one sentence each)
- Focused on actionable details (location, timing, severity, etc.)`

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
            content: 'You are a helpful assistant that generates JSON arrays of questions. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI API error:', errorData)
      return [] // Graceful degradation
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return []
    }

    // Parse JSON array from response
    // Try to extract JSON array if response has extra text
    let jsonStr = content
    const jsonMatch = content.match(/\[.*\]/s)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

    try {
      const questions = JSON.parse(jsonStr)
      if (Array.isArray(questions)) {
        // Validate and clean questions
        return questions
          .filter(q => typeof q === 'string' && q.trim().length > 0)
          .slice(0, 5) // Max 5 questions
          .map(q => q.trim())
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      return []
    }

    return []
  } catch (error) {
    console.error('OpenAI API request error:', error)
    return [] // Graceful degradation
  }
}

export async function POST(request) {
  try {
    // Require tenant authentication
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
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
          headers: {
            'Retry-After': rateLimitCheck.retryAfter.toString()
          }
        }
      )
    }

    const body = await request.json()
    const { category, description } = body

    // Validate input
    if (!category || !description || typeof category !== 'string' || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Category and description are required' },
        { status: 400 }
      )
    }

    if (description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Generate follow-up questions
    const questions = await generateFollowupQuestions(category.trim(), description.trim())

    return NextResponse.json({
      questions: questions || []
    })
  } catch (error) {
    console.error('AI followups error:', error)
    return NextResponse.json(
      { error: 'An error occurred', questions: [] },
      { status: 500 }
    )
  }
}
