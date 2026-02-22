'use client'

import { useState, useRef, useEffect } from 'react'

export default function BrandingManager() {
  const [logos, setLogos] = useState({
    owner: '',
    technical_partner: '',
    warranty_partner: ''
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [uploading, setUploading] = useState({})
  
  const fileInputRefs = {
    owner: useRef(null),
    technical_partner: useRef(null),
    warranty_partner: useRef(null)
  }

  // Fetch logos on mount
  useEffect(() => {
    const fetchLogos = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/branding/logos')
        const data = await res.json()
        if (res.ok && data.logoMap) {
          setLogos({
            owner: data.logoMap.owner || '',
            technical_partner: data.logoMap.technical_partner || '',
            warranty_partner: data.logoMap.warranty_partner || ''
          })
        }
      } catch (error) {
        console.error('Error fetching logos:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogos()
  }, [])

  const handleFileSelect = async (logoType, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'File size exceeds 5MB limit.' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      return
    }

    // Upload file
    setUploading({ ...uploading, [logoType]: true })
    setMessage({ type: '', text: '' })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('logo_type', logoType)

      const res = await fetch('/api/admin/branding/logos/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setLogos({ ...logos, [logoType]: data.logoUrl })
        setMessage({ type: 'success', text: `${logoType.replace('_', ' ')} logo uploaded successfully` })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        // Reload logos to ensure consistency
        const refreshRes = await fetch('/api/admin/branding/logos')
        const refreshData = await refreshRes.json()
        if (refreshRes.ok && refreshData.logoMap) {
          setLogos({
            owner: refreshData.logoMap.owner || '',
            technical_partner: refreshData.logoMap.technical_partner || '',
            warranty_partner: refreshData.logoMap.warranty_partner || ''
          })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload logo' })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while uploading' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } finally {
      setUploading({ ...uploading, [logoType]: false })
      // Reset file input
      if (fileInputRefs[logoType].current) {
        fileInputRefs[logoType].current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading logos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message.text && (
        <div className={`p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Owner Logo */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Owner Logo
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              ref={fileInputRefs.owner}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleFileSelect('owner', e)}
              disabled={uploading.owner}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP. Max 5MB.</p>
          </div>
        </div>
        {logos.owner && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Current Logo:</p>
            <div className="inline-block border border-gray-200 rounded p-2 bg-gray-50">
              <img
                src={logos.owner}
                alt="Owner logo"
                className="h-20 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <p className="text-xs text-red-500 mt-2" style={{ display: 'none' }}>
                Failed to load image.
              </p>
            </div>
          </div>
        )}
        {uploading.owner && (
          <p className="mt-2 text-sm text-blue-600">Uploading...</p>
        )}
      </div>

      {/* Technical Partner Logo */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Technical Partner Logo
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              ref={fileInputRefs.technical_partner}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleFileSelect('technical_partner', e)}
              disabled={uploading.technical_partner}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP. Max 5MB.</p>
          </div>
        </div>
        {logos.technical_partner && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Current Logo:</p>
            <div className="inline-block border border-gray-200 rounded p-2 bg-gray-50">
              <img
                src={logos.technical_partner}
                alt="Technical partner logo"
                className="h-20 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <p className="text-xs text-red-500 mt-2" style={{ display: 'none' }}>
                Failed to load image.
              </p>
            </div>
          </div>
        )}
        {uploading.technical_partner && (
          <p className="mt-2 text-sm text-blue-600">Uploading...</p>
        )}
      </div>

      {/* Warranty Partner Logo */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Warranty Partner Logo
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              ref={fileInputRefs.warranty_partner}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleFileSelect('warranty_partner', e)}
              disabled={uploading.warranty_partner}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP. Max 5MB.</p>
          </div>
        </div>
        {logos.warranty_partner && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Current Logo:</p>
            <div className="inline-block border border-gray-200 rounded p-2 bg-gray-50">
              <img
                src={logos.warranty_partner}
                alt="Warranty partner logo"
                className="h-20 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <p className="text-xs text-red-500 mt-2" style={{ display: 'none' }}>
                Failed to load image.
              </p>
            </div>
          </div>
        )}
        {uploading.warranty_partner && (
          <p className="mt-2 text-sm text-blue-600">Uploading...</p>
        )}
      </div>
    </div>
  )
}
