'use client'

import { useState, useEffect } from 'react'

export default function SettingsManager() {
  const [settings, setSettings] = useState({
    capmo_enabled: false,
    email_handoff_recipients: {
      contractor: '',
      warranty_manager: ''
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok) {
        setSettings({
          capmo_enabled: data.settings?.capmo_enabled?.enabled || false,
          email_handoff_recipients: data.settings?.email_handoff_recipients || {
            contractor: '',
            warranty_manager: ''
          }
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capmo_enabled: settings.capmo_enabled,
          email_handoff_recipients: settings.email_handoff_recipients
        })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500">Loading settings...</p>
  }

  return (
    <div className="space-y-6">
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

      {/* Capmo Integration */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capmo Integration</h3>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="capmo_enabled"
            checked={settings.capmo_enabled}
            onChange={(e) => setSettings({ ...settings, capmo_enabled: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="capmo_enabled" className="ml-2 text-sm text-gray-700">
            Enable Capmo handoff
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          When enabled, admins can handoff tickets to Capmo. Ensure objects have Capmo project IDs configured.
        </p>
      </div>

      {/* Email Handoff Recipients */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Handoff Recipients</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor Email
            </label>
            <input
              type="email"
              value={settings.email_handoff_recipients.contractor}
              onChange={(e) => setSettings({
                ...settings,
                email_handoff_recipients: {
                  ...settings.email_handoff_recipients,
                  contractor: e.target.value
                }
              })}
              placeholder="contractor@example.com"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warranty Manager Email
            </label>
            <input
              type="email"
              value={settings.email_handoff_recipients.warranty_manager}
              onChange={(e) => setSettings({
                ...settings,
                email_handoff_recipients: {
                  ...settings.email_handoff_recipients,
                  warranty_manager: e.target.value
                }
              })}
              placeholder="warranty@example.com"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          These email addresses will receive ticket handoff notifications when admins trigger email handoff.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
