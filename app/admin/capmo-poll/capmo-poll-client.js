'use client'

import { useState, useEffect } from 'react'

export default function CapmoPollClient() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [autoPolling, setAutoPolling] = useState(false)
  const [intervalId, setIntervalId] = useState(null)

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [intervalId])

  const triggerPoll = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/capmo-poll', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Poll failed')
      }

      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to trigger poll')
    } finally {
      setLoading(false)
    }
  }

  const startAutoPolling = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
      setAutoPolling(false)
      return
    }

    setAutoPolling(true)
    // Poll every 2 minutes (120000 ms)
    const id = setInterval(() => {
      triggerPoll()
    }, 2 * 60 * 1000)

    setIntervalId(id)
    // Trigger immediately
    triggerPoll()
  }

  const stopAutoPolling = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
      setAutoPolling(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Capmo Ticket Polling</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={triggerPoll}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Polling...' : 'Trigger Poll Now'}
            </button>

            <button
              onClick={autoPolling ? stopAutoPolling : startAutoPolling}
              className={`px-4 py-2 rounded ${
                autoPolling
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {autoPolling ? 'Stop Auto-Polling' : 'Start Auto-Polling (2 min)'}
            </button>
          </div>

          {autoPolling && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">
                Auto-polling is active. Polling every 2 minutes...
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-2">Poll Results</h2>
              <div className="bg-gray-50 p-4 rounded">
                <p>
                  <strong>Checked:</strong> {result.results?.checked || 0}
                </p>
                <p>
                  <strong>Updated:</strong> {result.results?.updated || 0}
                </p>
                <p>
                  <strong>Emails Sent:</strong> {result.results?.emails_sent || 0}
                </p>
                <p>
                  <strong>Skipped:</strong> {result.results?.skipped || 0}
                </p>
                <p>
                  <strong>Errors:</strong> {result.results?.errors || 0}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Setup External Cron (Recommended)
          </h2>
          <p className="mb-4 text-gray-700">
            Since Vercel Hobby plan doesn't support cron jobs, use a free external
            cron service:
          </p>
          <div className="bg-gray-50 p-4 rounded mb-4">
            <p className="font-mono text-sm break-all">
              <strong>URL:</strong> {typeof window !== 'undefined' && window.location.origin}
              /api/integrations/capmo/poll
            </p>
            <p className="mt-2">
              <strong>Method:</strong> POST
            </p>
            <p className="mt-2">
              <strong>Header:</strong> x-cron-secret: [Your CRON_SECRET from .env]
            </p>
            <p className="mt-2">
              <strong>Schedule:</strong> Every 2 minutes (*/2 * * * *)
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Note: Make sure CRON_SECRET is set in your environment variables
            </p>
          </div>
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Recommended free services:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <a
                  href="https://cron-job.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  cron-job.org
                </a>
              </li>
              <li>
                <a
                  href="https://www.easycron.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  EasyCron
                </a>
              </li>
              <li>
                <a
                  href="https://cronitor.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Cronitor (free tier)
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
