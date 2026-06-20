'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Bell,
  Check,
  Download,
  Info,
  type LucideIcon,
  PlusSquare,
  Share
} from 'lucide-react'
import { isStandalone, useInstallPrompt } from '@/lib/pwa/install'
import { useAuth } from '@/lib/auth/auth-provider'
import { useI18n } from '@/lib/i18n/i18n-provider'
import type { Dict } from '@/lib/i18n/dictionaries'

type InstallStep = { icon: LucideIcon; key: keyof Dict }

const STEPS: InstallStep[] = [
  { icon: Share, key: 'install_step_1' },
  { icon: PlusSquare, key: 'install_step_2' },
  { icon: Bell, key: 'install_step_3' }
]

export function InstallScreen() {
  const { t } = useI18n()
  const { isAuthenticated } = useAuth()
  const { canInstall, promptInstall } = useInstallPrompt()
  const router = useRouter()

  // If the app is already running standalone, the install gate is satisfied —
  // move straight on to login (or home if already authenticated).
  useEffect(() => {
    if (isStandalone()) {
      router.replace(isAuthenticated ? '/' : ('/login' as Route))
    }
  }, [isAuthenticated, router])

  function proceed() {
    router.replace(isAuthenticated ? '/' : ('/login' as Route))
  }

  async function onInstall() {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      proceed()
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '78px 26px 30px',
        background: '#fff',
        animation: 'rm-fade .3s ease'
      }}
    >
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '10px',
          background: 'var(--trinity-primary-l)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Download size={26} color="var(--trinity-primary)" />
      </div>

      <div style={{ marginTop: '18px', fontSize: '23px', fontWeight: 600 }}>{t.install_title}</div>
      <div
        style={{ marginTop: '8px', fontSize: '13.5px', lineHeight: '21px', color: 'var(--trinity-mfg)' }}
      >
        {t.install_sub}
      </div>

      <div style={{ marginTop: '22px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {STEPS.map(({ icon: Icon, key }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '13px',
              border: '1px solid var(--trinity-border)',
              borderRadius: 'var(--trinity-radius)',
              padding: '13px 14px',
              background: 'var(--trinity-muted2)'
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--trinity-radius)',
                background: '#fff',
                border: '1px solid var(--trinity-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none'
              }}
            >
              <Icon size={17} color="var(--trinity-primary)" />
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 500, lineHeight: '18px' }}>{t[key]}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '18px',
          border: '1px solid var(--trinity-warn-bg)',
          background: 'var(--trinity-warn-bg)',
          borderRadius: 'var(--trinity-radius)',
          padding: '12px 13px',
          display: 'flex',
          gap: '10px'
        }}
      >
        <Info size={17} color="var(--trinity-warn)" style={{ flex: 'none', marginTop: '1px' }} />
        <div style={{ fontSize: '12px', lineHeight: '17px', color: '#6b4d00' }}>{t.install_note}</div>
      </div>

      <div style={{ flex: 1 }} />

      {canInstall ? (
        <button type="button" onClick={onInstall} style={{ ...primaryBtn, marginBottom: '11px' }}>
          <Download size={19} />
          {t.install_prompt}
        </button>
      ) : null}

      <button type="button" onClick={proceed} style={primaryBtn}>
        <Check size={19} />
        {t.install_done}
      </button>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  height: '50px',
  borderRadius: '4px',
  background: 'var(--trinity-primary)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '9px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  border: 0,
  userSelect: 'none',
  transition: 'all .2s ease'
}
