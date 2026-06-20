'use client'

import { useEffect, useState } from 'react'

/**
 * The `beforeinstallprompt` event (Chromium). Not in the standard lib DOM types,
 * so we declare the minimal shape we use.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/** True when the app is running as an installed/standalone PWA. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  // iOS Safari exposes navigator.standalone instead of display-mode.
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return displayStandalone || iosStandalone
}

export type InstallPromptState = {
  /** Whether the app is already installed/standalone. */
  standalone: boolean
  /** True when a deferred install prompt is available to trigger. */
  canInstall: boolean
  /** Fires the native install prompt; resolves to the user's choice. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

/**
 * Captures the deferred `beforeinstallprompt` event and exposes standalone
 * detection. The install gate screen uses this to decide what to show.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    setStandalone(isStandalone())

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) {
      return 'unavailable'
    }
    await deferred.prompt()
    const choice = await deferred.userChoice
    setDeferred(null)
    return choice.outcome
  }

  return { standalone, canInstall: deferred !== null, promptInstall }
}
