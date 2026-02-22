'use client'

import { useState, useEffect } from 'react'

export default function TicketActions({ ticketId, initialStatus, initialWarrantyFlag }) {
  const [status, setStatus] = useState(initialStatus || 'Open')
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || 'Open') // Local state for dropdown
  const [warrantyFlag, setWarrantyFlag] = useState(initialWarrantyFlag || false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activityLogs, setActivityLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  // Check if there are unsaved changes
  const hasUnsavedChanges = selectedStatus !== status

  // Load activity logs
  useEffect(() => {
    loadActivityLogs()
  }, [ticketId])

  // Sync selectedStatus when initialStatus changes
  useEffect(() => {
    setStatus(initialStatus || 'Open')
    setSelectedStatus(initialStatus || 'Open')
  }, [initialStatus])

  const loadActivityLogs = async () => {
    try {
      setLoadingLogs(true)
      const res = await fetch(`/api/admin/tickets/${ticketId}/activity`)
      const data = await res.json()
      if (res.ok) {
        setActivityLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error loading activity logs:', error)
    } finally {
      setLoadingLogs(false)
    }
  }

  const saveStatus = async () => {
    if (selectedStatus === status) return // No changes

    try {
      setLoading(true)
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus })
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(selectedStatus)
        setMessage({ type: 'success', text: 'Status updated successfully' })
        await loadActivityLogs()
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update status' })
        // Revert selection on error
        setSelectedStatus(status)
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
      // Revert selection on error
      setSelectedStatus(status)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } finally {
      setLoading(false)
    }
  }

  const toggleWarrantyFlag = async () => {
    try {
      setLoading(true)
      const newValue = !warrantyFlag
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warranty_flag: newValue })
      })
      const data = await res.json()
      if (res.ok) {
        setWarrantyFlag(newValue)
        setMessage({ type: 'success', text: `Warranty flag ${newValue ? 'enabled' : 'disabled'}` })
        await loadActivityLogs()
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update warranty flag' })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = () => {
    window.open(`/api/admin/tickets/${ticketId}/pdf`, '_blank')
  }

  const formatActionType = (actionType) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      {/* Status and Warranty Flag Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Management</h3>
        
        {/* Status Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={loading}
              className={`flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                hasUnsavedChanges ? 'border-yellow-400 bg-yellow-50' : ''
              }`}
            >
              <option value="Open">Open</option>
              <option value="In Review">In Review</option>
              <option value="Closed">Closed</option>
            </select>
            <button
              onClick={saveStatus}
              disabled={loading || !hasUnsavedChanges}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
          {hasUnsavedChanges && (
            <p className="mt-1 text-xs text-yellow-600">You have unsaved changes</p>
          )}
        </div>

        {/* Warranty Flag Toggle */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={warrantyFlag}
              onChange={toggleWarrantyFlag}
              disabled={loading}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Warranty Flag</span>
          </label>
        </div>

        {/* Message Toast */}
        {message.text && (
          <div className={`p-3 rounded-md text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* PDF Report */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report</h3>
        <button
          onClick={downloadPDF}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
        >
          Download PDF Report
        </button>
      </div>

      {/* Activity Log */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
        {loadingLogs ? (
          <p className="text-sm text-gray-500">Loading activity log...</p>
        ) : activityLogs.length === 0 ? (
          <p className="text-sm text-gray-500">No activity recorded yet.</p>
        ) : (
          <div className="activity-log-scrollable space-y-3 max-h-96 overflow-y-auto pr-2">
            {activityLogs.map((log) => (
              <div key={log.id} className="border-l-2 border-indigo-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatActionType(log.action_type)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      by {log.admin_email}
                    </p>
                    {log.action_details && Object.keys(log.action_details).length > 0 && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(log.action_details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
