'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ImportTenantsPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop().toLowerCase()
      if (['csv', 'xlsx', 'xls'].includes(extension)) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please select a .csv or .xlsx file')
        setFile(null)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/tenants/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Import failed')
        setLoading(false)
        return
      }

      setResult(data)
      setFile(null)
      // Reset file input
      e.target.reset()
    } catch (error) {
      console.error('Import error:', error)
      setError('An error occurred during import')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Link
          href="/admin/tenants"
          className="text-indigo-600 hover:text-indigo-900 mb-4 inline-block"
        >
          ← Back to tenants
        </Link>

        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Import Tenants</h2>

          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">File Format Requirements:</h3>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>File must be .csv or .xlsx format</li>
              <li>First row should contain column headers</li>
              <li>Required columns: Tenant ID, First Name, Last Name</li>
              <li>Optional columns: Email, Phone, Building Name, Unit Number</li>
              <li>Column names are case-insensitive and can use spaces or underscores</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {result && (
            <div className="rounded-md bg-green-50 p-4 mb-6">
              <h3 className="text-sm font-medium text-green-900 mb-2">Import Complete!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>Imported: {result.imported} tenants</li>
                <li>Updated: {result.updated} tenants</li>
                {result.errors && result.errors.length > 0 && (
                  <li>Errors: {result.errors.length} rows</li>
                )}
              </ul>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Errors:</h4>
                  <ul className="text-sm text-green-800 list-disc list-inside space-y-1">
                    {result.errors.slice(0, 10).map((err, index) => (
                      <li key={index}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... and {result.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <input
                type="file"
                name="file"
                id="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href="/admin/tenants"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !file}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Importing...' : 'Import Tenants'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}


