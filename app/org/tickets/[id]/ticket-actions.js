'use client'

import { useState } from 'react'
import { Toast } from '@/app/components/toast'

const ROLE_SEQUENCE = ['technical', 'warranty', 'owner']

function normalizeRole(role) {
  return role ? role.toLowerCase() : ''
}

function roleLabel(role) {
  if (!role) return 'Unassigned'
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`
}

export default function TicketActions({ ticketId, currentRole, roles }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const current = normalizeRole(currentRole)
  const userRoles = (roles || []).map((role) => role.toLowerCase())

  const canActOnCurrent = current && userRoles.includes(current)
  const isOwnerStage = current === 'owner'
  const nextRole = current ? ROLE_SEQUENCE[ROLE_SEQUENCE.indexOf(current) + 1] : 'technical'

  const handleAction = async (action) => {
    setLoading(true)
    setError(null)
    setToast(null)
    
    // Determine success message based on action
    let successMessage = 'Ticket updated successfully'
    if (action === 'advance') {
      const current = normalizeRole(currentRole)
      const nextRole = current ? ROLE_SEQUENCE[ROLE_SEQUENCE.indexOf(current) + 1] : 'technical'
      successMessage = `Ticket passed to ${roleLabel(nextRole)} successfully`
    } else if (action === 'approve') {
      successMessage = 'Ticket approved and closed successfully'
    } else if (action === 'set_technical') {
      successMessage = 'Ticket assigned to Technical successfully'
    }
    
    try {
      const response = await fetch(`/api/org/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update ticket')
      }

      // Show success toast
      setToast({ message: successMessage, type: 'success' })
      
      // Reload after a short delay to let user see the toast
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err.message || 'An error occurred')
      setToast({ message: err.message || 'An error occurred', type: 'error' })
      setLoading(false)
    }
  }

  if (!current) {
    return (
      <button
        type="button"
        onClick={() => handleAction('set_technical')}
        className="px-5 py-2.5 text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Setting...' : 'Assign to Technical'}
      </button>
    )
  }

  if (!canActOnCurrent) {
    return null
  }

  if (isOwnerStage) {
    return (
      <>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => handleAction('approve')}
            className="px-5 py-2.5 text-sm font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Approving...' : 'Approve & Close'}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </>
    )
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => handleAction('advance')}
          className="px-5 py-2.5 text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          disabled={loading || !nextRole}
        >
          {loading ? 'Updating...' : `Pass to ${roleLabel(nextRole)}`}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </>
  )
}
