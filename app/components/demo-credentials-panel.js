'use client'

/**
 * Visible demo credential panel for portfolio recruiters.
 * Values are always rendered from client constants — never blank if the API is down.
 */
export default function DemoCredentialsPanel({
  title = 'Demo admin',
  email,
  password,
  onFill,
  onOfflinePreview,
  offlinePreviewLabel = 'Preview offline demo',
  showOfflinePreview = true,
  hint = 'Use these credentials for portfolio walkthroughs. They stay visible even if the backend is unavailable.',
}) {
  return (
    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-indigo-900">{title}</h3>
        <p className="mt-1 text-xs text-indigo-800">{hint}</p>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <dt className="text-indigo-700 font-medium">Email</dt>
          <dd>
            <code className="rounded bg-white px-2 py-1 text-indigo-900 border border-indigo-100 break-all">
              {email}
            </code>
          </dd>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <dt className="text-indigo-700 font-medium">Password</dt>
          <dd>
            <code className="rounded bg-white px-2 py-1 text-indigo-900 border border-indigo-100">
              {password}
            </code>
          </dd>
        </div>
      </dl>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onFill}
          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-800 bg-white hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Use demo account
        </button>
        {showOfflinePreview && onOfflinePreview && (
          <button
            type="button"
            onClick={onOfflinePreview}
            className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {offlinePreviewLabel}
          </button>
        )}
      </div>
    </div>
  )
}
