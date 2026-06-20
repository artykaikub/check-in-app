'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries, type Dict, type Lang } from './dictionaries'

const STORAGE_KEY = 'trinity.lang'
const DEFAULT_LANG: Lang = 'th'

type I18nContextValue = {
  lang: Lang
  t: Dict
  setLang: (lang: Lang) => void
  toggleLang: () => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

function readStoredLang(): Lang {
  if (typeof window === 'undefined') {
    return DEFAULT_LANG
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'th' || stored === 'en' ? stored : DEFAULT_LANG
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start from the default to keep SSR/first-paint deterministic, then hydrate
  // the persisted choice on mount.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    setLangState(readStoredLang())
  }, [])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage may be unavailable (private mode); ignore.
    }
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'th' ? 'en' : 'th')
  }, [lang, setLang])

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      t: dictionaries[lang],
      setLang,
      toggleLang
    }),
    [lang, setLang, toggleLang]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}
