'use client'

export default function DemoCredentialsPanel({ title = 'Demo credentials', fields, onFill }) {
  return (
    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-indigo-900">{title}</h3>
      <div className="text-sm text-indigo-800 space-y-1">
        {fields.map(({ label, value }) => (
          <p key={label}>
            {label}:{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-100">{value}</code>
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={onFill}
        className="w-full inline-flex justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-800 bg-white hover:bg-indigo-100"
      >
        Fill demo
      </button>
    </div>
  )
}
