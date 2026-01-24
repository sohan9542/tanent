'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GoogleTranslateToggle from '@/app/components/google-translate-toggle'

export default function ReportDefectPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const CATEGORIES = [
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'heating', label: 'Heating' },
    { value: 'other', label: 'Other' }
  ]

  const URGENCY_LEVELS = [
    { value: 'low', label: 'Low', description: 'Non-urgent issue that can be addressed during regular maintenance' },
    { value: 'medium', label: 'Medium', description: 'Issue that should be addressed within a few days' },
    { value: 'high', label: 'High', description: 'Urgent issue requiring immediate attention' }
  ]

  // Form data
  const [category, setCategory] = useState('')
  const [locationDetails, setLocationDetails] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('')
  const [images, setImages] = useState([])
  
  // Conversational AI state
  const [conversationHistory, setConversationHistory] = useState([]) // Array of {question, answer}
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [fetchingAI, setFetchingAI] = useState(false)
  const [hasAIChecked, setHasAIChecked] = useState(false)
  const [aiQuestionsComplete, setAiQuestionsComplete] = useState(false)
  const [allQuestions, setAllQuestions] = useState([]) // Store all questions from API
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const MAX_AI_QUESTIONS = 4
  const chatScrollRef = useRef(null)

  // Dynamic total steps: if AI questions exist or we're fetching, we have 6 steps, otherwise 5
  const totalSteps = (conversationHistory.length > 0 || currentQuestion || fetchingAI || !aiQuestionsComplete) ? 6 : 5

  // Auto-scroll chat to bottom when new messages are added
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [conversationHistory, currentQuestion, fetchingAI])

  // Step 1: Category
  // Step 2: Location
  // Step 3: Description
  // Step 4: AI Follow-ups (if questions exist, otherwise skip to step 5)
  // Step 5: Urgency
  // Step 6: Review & Submit

  const fetchNextQuestion = async (historyToUse = null) => {
    setFetchingAI(true)
    setError(null)
    
    // Use provided history or current state
    const history = historyToUse !== null ? historyToUse : conversationHistory
    
    try {
      const response = await fetch('/api/ai/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category, 
          description,
          conversationHistory: history
        })
      })
      const data = await response.json()
      
      console.log('AI Response:', data) // Debug log
      
      // Handle questions array from API
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        // Store all questions and show the first one
        setAllQuestions(data.questions)
        setCurrentQuestionIndex(0)
        setCurrentQuestion(data.questions[0].trim())
        setCurrentAnswer('')
        setAiQuestionsComplete(false)
      } else if (data.question && data.question.trim()) {
        // Fallback: single question format
        setCurrentQuestion(data.question.trim())
        setCurrentAnswer('')
        setAiQuestionsComplete(false)
      } else {
        // No questions returned
        console.log('No questions returned from API')
        setAiQuestionsComplete(true)
        setCurrentQuestion(null)
        if (currentStep === 4) {
          setCurrentStep(5) // Move to urgency step
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI question:', err)
      setError('Failed to get question. You can proceed.')
      setAiQuestionsComplete(true)
      setCurrentQuestion(null)
      if (currentStep === 4) {
        setCurrentStep(5)
      }
    } finally {
      setFetchingAI(false)
    }
  }

  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim()) {
      setError('Please provide an answer')
      return
    }

    if (!currentQuestion) return

    // Add to conversation history
    const newHistory = [
      ...conversationHistory,
      { question: currentQuestion, answer: currentAnswer.trim() }
    ]
    
    // Update state
    setConversationHistory(newHistory)
    setCurrentAnswer('')
    setError(null)

    // Check if we have more questions from the array
    const nextIndex = currentQuestionIndex + 1
    
    if (allQuestions.length > 0 && nextIndex < allQuestions.length) {
      // Show next question from the array
      setCurrentQuestionIndex(nextIndex)
      setCurrentQuestion(allQuestions[nextIndex].trim())
      setAiQuestionsComplete(false) // Make sure we don't show completion message yet
    } else if (newHistory.length >= MAX_AI_QUESTIONS) {
      // Reached max questions
      setAiQuestionsComplete(true)
      setCurrentQuestion(null)
      setCurrentStep(5) // Move to urgency step
    } else {
      // No more questions - all answered
      setAiQuestionsComplete(true)
      setCurrentQuestion(null)
      if (currentStep === 4) {
        setCurrentStep(5) // Move to urgency step
      }
    }
  }

  const handleNext = async () => {
    if (currentStep === 3 && description.trim().length >= 10 && !hasAIChecked) {
      // After description, start AI conversation
      setHasAIChecked(true)
      setCurrentStep(4)
      await fetchNextQuestion()
      return
    }

    // Normal step progression
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      setError(null)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }

    // Validate files
    for (const file of files) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Only JPG, PNG, and WebP images are allowed')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Each image must be less than 5MB')
        return
      }
    }

    setImages([...images, ...files])
    setError(null)
  }

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!category || !description || !urgency) {
      setError('Please complete all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('category', category)
      formData.append('locationDetails', locationDetails)
      formData.append('description', description)
      formData.append('urgency', urgency)
      formData.append('conversationHistory', JSON.stringify(conversationHistory))

      // Add images
      images.forEach((image, index) => {
        formData.append(`image${index}`, image)
      })

      const response = await fetch('/api/pre-tickets', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create pre-ticket')
      }

      // Redirect to unified ticket page
      router.push(`/tickets/${data.preTicket.id}`)
    } catch (err) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return category !== ''
      case 2:
        return true // Location is optional
      case 3:
        return description.trim().length >= 10
      case 4:
        // Can proceed if AI questions are complete or no current question
        return aiQuestionsComplete || (!currentQuestion && !fetchingAI)
      case 5:
        return urgency !== ''
      case 6:
        return true
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                <h1 className="text-lg sm:text-xl font-semibold">Tenant Portal</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                Dashboard
              </Link>
              <GoogleTranslateToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Report Defect</h2>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <div
                  key={step}
                  className={`flex-1 flex items-center ${
                    step < totalSteps ? 'mr-2' : ''
                  }`}
                >
                  <div
                    className={`flex-1 h-2 rounded ${
                      step <= currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                  {step < totalSteps && (
                    <div
                      className={`w-2 h-2 rounded-full mx-1 ${
                        step < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500" style={{ gap: '0.25rem' }}>
              {(() => {
                const labels = ['Category', 'Location', 'Description']
                if (totalSteps === 6) {
                  labels.push('Questions')
                }
                labels.push('Urgency', 'Review')
                return labels.map((label, index) => (
                  <span key={index} className="flex-1 text-center">{label}</span>
                ))
              })()}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="mb-8">
            {currentStep === 1 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Select Category
                </h3>
                <div className="space-y-3">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat.value}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                        category === cat.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={category === cat.value}
                        onChange={(e) => setCategory(e.target.value)}
                        className="mr-3 h-4 w-4 text-indigo-600"
                      />
                      <span className="text-gray-900 font-medium">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Location Details
                </h3>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Where is the issue located?
                </label>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="e.g., Kitchen, Bathroom, Living Room"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Description
                </h3>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe the issue <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Please provide a detailed description of the defect or issue..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  {description.length}/10 minimum characters
                </p>

                {/* Image Upload */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images (Optional, max 5)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Additional Questions
                </h3>
                
                {/* Chat Container with Fixed Height */}
                <div className="mb-6 border border-gray-200 rounded-lg bg-gray-50 p-4">
                  {/* Conversation History - Fixed Height Scrollable */}
                  <div 
                    ref={chatScrollRef}
                    className="h-96 overflow-y-auto pr-2 space-y-4 mb-4 scroll-smooth"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    {conversationHistory.map((item, index) => (
                      <div key={index} className="space-y-2">
                        {/* AI Question */}
                        <div className="flex justify-start">
                          <div className="max-w-[80%] bg-indigo-50 rounded-lg px-4 py-3">
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">AI</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900 whitespace-pre-wrap">{item.question}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* User Answer */}
                        <div className="flex justify-end">
                          <div className="max-w-[80%] bg-gray-100 rounded-lg px-4 py-3">
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{item.answer}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Current Question in Chat */}
                    {fetchingAI ? (
                      <div className="flex justify-start">
                        <div className="bg-indigo-50 rounded-lg px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">AI</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                              <p className="text-sm text-gray-600">Generating questions...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : currentQuestion ? (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] bg-indigo-50 rounded-lg px-4 py-3">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">AI</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">{currentQuestion}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Answer Input - Outside scrollable area */}
                  {!aiQuestionsComplete && (fetchingAI || currentQuestion) && (
                    <div className="border-t border-gray-200 pt-4">
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleAnswerSubmit()
                          }
                        }}
                        rows={3}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Press Ctrl+Enter to submit
                      </p>
                      <button
                        onClick={handleAnswerSubmit}
                        disabled={!currentAnswer.trim() || fetchingAI}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Submit Answer
                      </button>
                    </div>
                  )}

                  {/* Completion Message */}
                  {aiQuestionsComplete && !currentQuestion && !fetchingAI && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="p-4 bg-green-50 rounded-md">
                        <p className="text-sm text-green-800">
                          Thank you for answering the questions. You can proceed to the next step.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Urgency Level
                </h3>
                <div className="space-y-3">
                  {URGENCY_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                        urgency === level.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={level.value}
                        checked={urgency === level.value}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="mt-1 mr-3 h-4 w-4 text-indigo-600"
                      />
                      <div>
                        <span className="text-gray-900 font-medium">{level.label}</span>
                        <p className="text-sm text-gray-500 mt-1">{level.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & Submit</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Category:</span>
                    <p className="text-gray-900 capitalize">{category}</p>
                  </div>
                  {locationDetails && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Location:</span>
                      <p className="text-gray-900">{locationDetails}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-500">Description:</span>
                    <p className="text-gray-900 whitespace-pre-wrap">{description}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Urgency:</span>
                    <p className="text-gray-900 capitalize">{urgency}</p>
                  </div>
                  {images.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Images:</span>
                      <p className="text-gray-900">{images.length} image(s)</p>
                    </div>
                  )}
                  {conversationHistory.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Questions & Answers:</span>
                      <div className="mt-2 space-y-3 max-h-64 overflow-y-auto">
                        {conversationHistory.map((item, index) => (
                          <div key={index} className="bg-gray-50 rounded-md p-3 space-y-2">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Q{index + 1}:</p>
                              <p className="text-sm text-gray-900">{item.question}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">A{index + 1}:</p>
                              <p className="text-sm text-gray-900">{item.answer}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
