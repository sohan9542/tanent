'use client'

import { useEffect, useState } from 'react'

export function Toast({ message, type = 'success', onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        onClose?.()
      }, 300) // Wait for fade out animation
    }, 3000) // Show for 3 seconds

    return () => clearTimeout(timer)
  }, [onClose])

  if (!isVisible) return null

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600'
  const icon = type === 'success' ? '✓' : '✕'

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in`}
      style={{
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span className="text-xl font-bold">{icon}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => onClose?.(), 300)
        }}
        className="text-white hover:text-gray-200 text-xl font-bold"
      >
        ×
      </button>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
