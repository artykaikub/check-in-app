'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker that caches the app shell and serves an offline
 * fallback. Renders nothing; mounted once in the root layout. Registration is
 * skipped in development to avoid stale-cache surprises during HMR.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return
    }
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures are non-fatal — the app still works online.
      })
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
