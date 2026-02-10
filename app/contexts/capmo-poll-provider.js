'use client'

import { createContext, useContext, useEffect, useRef } from 'react'

const CapmoPollContext = createContext(null)

export function CapmoPollProvider({ children }) {
  const intervalRef = useRef(null)
  const isPollingRef = useRef(false)

  const triggerPoll = async () => {
    // Prevent concurrent polls
    if (isPollingRef.current) {
      return
    }

    isPollingRef.current = true

    try {
      // Call the auto-poll endpoint - runs automatically whenever app is active
      const response = await fetch('/api/integrations/capmo/poll/auto', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        // Silently fail - don't spam console
        // Only log unexpected errors
        if (response.status >= 500) {
          console.warn('Capmo poll failed:', response.status)
        }
      }
    } catch (error) {
      // Silently fail - don't spam console
      // Network errors are expected if server is down or user is offline
      if (error.name !== 'TypeError' && !error.message.includes('fetch')) {
        console.warn('Capmo poll error:', error.message)
      }
    } finally {
      isPollingRef.current = false
    }
  }

  useEffect(() => {
    // Start polling when component mounts
    // Poll every 2 minutes (120000 ms)
    intervalRef.current = setInterval(() => {
      triggerPoll()
    }, 2 * 60 * 1000)

    // Trigger initial poll after 5 seconds (give app time to load)
    const initialTimeout = setTimeout(() => {
      triggerPoll()
    }, 5000)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearTimeout(initialTimeout)
    }
  }, [])

  return (
    <CapmoPollContext.Provider value={{ triggerPoll }}>
      {children}
    </CapmoPollContext.Provider>
  )
}

export function useCapmoPoll() {
  const context = useContext(CapmoPollContext)
  return context
}
