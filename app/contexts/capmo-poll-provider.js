'use client'

import { useEffect, useRef } from 'react'

export function CapmoPollProvider({ children }) {
  const intervalRef = useRef(null)
  const isPollingRef = useRef(false)

  useEffect(() => {
    const triggerPoll = async () => {
      if (isPollingRef.current) return
      isPollingRef.current = true
      try {
        const response = await fetch('/api/integrations/capmo/poll/auto', {
          method: 'POST',
          credentials: 'include'
        })
        if (!response.ok && response.status >= 500) {
          console.warn('Capmo poll failed:', response.status)
        }
      } catch (error) {
        if (error.name !== 'TypeError' && !error.message?.includes('fetch')) {
          console.warn('Capmo poll error:', error.message)
        }
      } finally {
        isPollingRef.current = false
      }
    }

    intervalRef.current = setInterval(triggerPoll, 2 * 60 * 1000)
    const initialTimeout = setTimeout(triggerPoll, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      clearTimeout(initialTimeout)
    }
  }, [])

  return <>{children}</>
}
