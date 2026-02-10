'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoUpload({ organizationId, currentLogoUrl, onUploadSuccess }) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preview, setPreview] = useState(currentLogoUrl)
  const fileInputRef = useRef(null)

  // Sync preview with prop changes (e.g., after page refresh)
  useEffect(() => {
    setPreview(currentLogoUrl)
  }, [currentLogoUrl])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous messages
    setError('')
    setSuccess('')

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Please select a file')
      setSuccess('')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/org/logo/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Show success message
      setSuccess('Logo uploaded successfully!')
      setError('')

      // Update preview with new URL
      setPreview(data.logoUrl)
      
      if (onUploadSuccess) {
        onUploadSuccess(data.logoUrl)
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Refresh page data after a short delay to show success message
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to upload logo')
      setSuccess('')
      // Revert preview to current logo on error
      setPreview(currentLogoUrl)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Logo</h3>
      
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Logo Preview */}
        <div className="flex-shrink-0">
          {preview ? (
            <img
              src={preview}
              alt="Organization logo"
              className="w-32 h-32 object-contain border border-gray-300 rounded-lg bg-gray-50"
            />
          ) : (
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-400 text-sm">No logo</span>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Logo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              disabled={uploading}
            />
            <p className="mt-1 text-xs text-gray-500">
              JPG, PNG, or WebP. Max 5MB.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !fileInputRef.current?.files?.[0]}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {uploading ? 'Uploading...' : 'Upload Logo'}
          </button>
        </div>
      </div>
    </div>
  )
}
