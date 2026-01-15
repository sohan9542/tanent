'use client'

import { useState } from 'react'

export default function TicketThread({ ticketId, initialMessages, orgLabel }) {
  const [messages, setMessages] = useState(initialMessages || [])
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const formatDateTime = (value) => {
    if (!value) return ''
    return new Date(value).toLocaleString('en-GB', { hour12: false })
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length + attachments.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }

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

    setAttachments([...attachments, ...files])
    setError(null)
  }

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleAddMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() && attachments.length === 0) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('message', message.trim() || 'No message')

      attachments.forEach((file, index) => {
        formData.append(`attachment${index}`, file)
      })

      const response = await fetch(`/api/org/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add message')
      }

      setMessages([...messages, data.message])
      setMessage('')
      setAttachments([])
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Conversation</h3>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation below.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg ${
                msg.created_by_tenant ? 'bg-indigo-50 ml-4' : 'bg-gray-50 mr-4'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {msg.created_by_tenant ? 'Tenant' : (orgLabel || 'Organization')}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDateTime(msg.created_at)}
                </span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap mb-2">{msg.message}</p>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {msg.attachments.map((att, index) => (
                    <a
                      key={index}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={att.url}
                        alt={att.filename}
                        className="w-full h-24 object-cover rounded-md hover:opacity-80 transition"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddMessage} className="border-t border-gray-200 pt-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add a message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Write an update to the tenant..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attach Images (optional, max 5)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {attachments.length > 0 && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
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

        <button
          type="submit"
          disabled={loading || (!message.trim() && attachments.length === 0)}
          className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  )
}
