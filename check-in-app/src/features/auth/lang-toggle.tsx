'use client'

import { Languages } from 'lucide-react'
import { useI18n } from '@/lib/i18n/i18n-provider'

/**
 * Language toggle pill used on the auth screens (login / install gate).
 * `t.lang_switch` holds the label of the *other* language (e.g. "English"
 * while in Thai), matching the prototype's `langSwitchLabel`.
 */
export function LangToggle({ className }: { className?: string }) {
  const { t, toggleLang } = useI18n()
  return (
    <button
      type="button"
      onClick={toggleLang}
      className={className}
      style={{
        alignSelf: 'center',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--trinity-mfg)',
        cursor: 'pointer',
        padding: '8px 12px',
        border: '1px solid var(--trinity-border)',
        borderRadius: 'var(--trinity-radius)',
        background: 'transparent'
      }}
    >
      <Languages size={16} />
      {t.lang_switch}
    </button>
  )
}
