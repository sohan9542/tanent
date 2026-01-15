'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'heating', label: 'Heating' },
  { value: 'other', label: 'Other' }
]

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Minor issue, can wait' },
  { value: 'medium', label: 'Medium', description: 'Needs attention soon' },
  { value: 'high', label: 'High', description: 'Urgent - needs immediate attention' }
]

export default function ReportDefectPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Form data
  const [category, setCategory] = useState('')
  const [locationDetails, setLocationDetails] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('')
  const [images, setImages] = useState([])
  const [aiFollowups, setAiFollowups] = useState([])
  const [aiAnswers, setAiAnswers] = useState({})
  const [fetchingAI, setFetchingAI] = useState(false)
  const [hasAIChecked, setHasAIChecked] = useState(false) // Track if we've checked for AI questions

  // Dynamic total steps: if AI questions exist or we're fetching, we have 6 steps, otherwise 5
  const totalSteps = (aiFollowups.length > 0 || fetchingAI) ? 6 : 5

  // Step 1: Category
  // Step 2: Location
  // Step 3: Description
  // Step 4: AI Follow-ups (if questions exist, otherwise skip to step 5)
  // Step 5: Urgency
  // Step 6: Review & Submit

  const handleNext = async () => {
    if (currentStep === 3 && description.trim().length >= 10 && !hasAIChecked) {
      // After description, fetch AI follow-ups
      // First, move to step 4 and show loading state
      setFetchingAI(true)
      setLoading(true)
      setHasAIChecked(true)
      setCurrentStep(4) // Move to step 4 immediately to show the Questions step
      
      try {
        const response = await fetch('/api/ai/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, description })
        })
        const data = await response.json()
        console.log('AI Follow-ups Response:', data) // Debug log
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setAiFollowups(data.questions)
          // Initialize answers object
          const answers = {}
          data.questions.forEach(q => {
            answers[q] = ''
          })
          setAiAnswers(answers)
          // Stay on step 4 to show questions
          console.log('AI questions set:', data.questions.length, 'questions') // Debug log
        } else {
          // No questions, skip AI step and go to urgency (step 5)
          console.log('No AI questions received, skipping to urgency') // Debug log
          setAiFollowups([])
          setCurrentStep(5)
        }
        setError(null)
      } catch (err) {
        console.error('Failed to fetch AI follow-ups:', err)
        // Continue without AI questions, go to urgency
        setAiFollowups([])
        setCurrentStep(5)
        setError(null)
      } finally {
        setFetchingAI(false)
        setLoading(false)
      }
      return // Don't continue with normal step increment
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
      formData.append('aiFollowups', JSON.stringify(aiFollowups))
      formData.append('aiAnswers', JSON.stringify(aiAnswers))

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
        return true // AI questions are optional
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
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Report a Defect</h2>

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
                  What type of defect is this?
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
                  Where is the defect located?
                </h3>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit/Apartment Area (optional)
                </label>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="e.g., Kitchen, Bathroom, Unit 3A"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Describe the issue
                </h3>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Please provide a detailed description of the defect..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  {description.length}/10 minimum characters
                </p>

                {/* Image Upload */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images (optional, max 5)
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
                  Additional Questions (Optional)
                </h3>
                {fetchingAI ? (
                  <div className="p-4 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">Generating follow-up questions...</p>
                  </div>
                ) : aiFollowups.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      To help us better understand your issue, please answer these questions:
                    </p>
                    {aiFollowups.map((question, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {question}
                        </label>
                        <textarea
                          value={aiAnswers[question] || ''}
                          onChange={(e) =>
                            setAiAnswers({ ...aiAnswers, [question]: e.target.value })
                          }
                          rows={3}
                          placeholder="Your answer (optional)..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">No additional questions at this time. You can proceed to the next step.</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  How urgent is this issue?
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
