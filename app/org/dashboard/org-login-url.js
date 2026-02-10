'use client'

import { useState } from 'react'

export default function OrgLoginUrl({ organizationId }) {
  const [copied, setCopied] = useState(false)

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : ''
  const loginUrl = `${baseUrl}/org/login?id=${organizationId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(loginUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Your organization login URL</h3>
      <p className="text-sm text-gray-600 mb-3">
        Share this link so users can sign in with your organization&apos;s logo on the login page.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 min-w-0 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <code className="text-sm text-gray-800 break-all select-all block">
            {loginUrl}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium whitespace-nowrap"
        >
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      </div>
    </div>
  )
}
