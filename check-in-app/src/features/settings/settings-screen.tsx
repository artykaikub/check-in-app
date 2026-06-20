'use client'

import { Clock, LogOut, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGetFrontendProfile } from '@/generated/api/frontend/frontend'
import { useAuth } from '@/lib/auth/auth-provider'
import { getDeviceUuid } from '@/lib/auth/device'
import { useI18n } from '@/lib/i18n/i18n-provider'
import type { Lang } from '@/lib/i18n/dictionaries'
import { useShell } from '@/lib/shell/shell-provider'

const APP_VERSION = 'v1.0'

/** Font-scale presets mirroring the prototype's `fontSizes`. */
const FONT_SIZES: { scale: number; glyph: number; labelKey: 'fs_s' | 'fs_m' | 'fs_l' | 'fs_xl' }[] = [
  { scale: 0.9, glyph: 15, labelKey: 'fs_s' },
  { scale: 1, glyph: 18, labelKey: 'fs_m' },
  { scale: 1.15, glyph: 21, labelKey: 'fs_l' },
  { scale: 1.3, glyph: 25, labelKey: 'fs_xl' }
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '—'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Mask a device UUID for display, e.g. `a1b2c3d4 ·••• · …f9e8`. */
function maskToken(token: string | null): string {
  if (!token) {
    return '—'
  }
  const compact = token.replace(/-/g, '')
  if (compact.length <= 12) {
    return token
  }
  return `${compact.slice(0, 8)} ···· ${compact.slice(-4)}`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--trinity-mfg)',
        textTransform: 'uppercase',
        letterSpacing: '.5px',
        marginBottom: 8
      }}
    >
      {children}
    </div>
  )
}

/**
 * SETTINGS screen body (`onSettings`): profile card, language + text-size
 * selectors, device-binding card, session info, and logout. All transient prefs
 * flow through `useShell()` / `useI18n()`.
 */
export function SettingsScreen() {
  const { t, lang, setLang } = useI18n()
  const { user, signOut } = useAuth()
  const { fontScale, setFontScale } = useShell()
  const profileQuery = useGetFrontendProfile()

  const profileUser = profileQuery.data?.user ?? user
  const empName = profileUser?.fullName ?? profileUser?.email ?? '—'
  const empId = profileUser?.employeeCode ?? profileUser?.id ?? '—'
  const empInitials = initials(empName === '—' ? '' : empName)
  const siteShort = profileUser?.email ?? ''

  // Device token is client-only; read after mount to avoid hydration mismatch.
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  useEffect(() => {
    setDeviceToken(getDeviceUuid())
  }, [])

  const setLangTo = (next: Lang) => setLang(next)

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* profile */}
      <div
        className="flex items-center gap-3"
        style={{
          background: '#fff',
          border: '1px solid var(--trinity-border)',
          borderRadius: 10,
          padding: 15
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 46,
            height: 46,
            borderRadius: 8,
            background: 'var(--trinity-primary)',
            color: '#fff',
            fontWeight: 600
          }}
        >
          {empInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{empName}</div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--trinity-mfg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {empId}
            {siteShort ? ` · ${siteShort}` : ''}
          </div>
        </div>
      </div>

      {/* language */}
      <div>
        <SectionLabel>{t.language}</SectionLabel>
        <div
          className="flex gap-1.5"
          style={{
            background: '#fff',
            border: '1px solid var(--trinity-border)',
            borderRadius: 8,
            padding: 6
          }}
        >
          {(['th', 'en'] as const).map((code) => {
            const active = lang === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLangTo(code)}
                className="flex flex-1 items-center justify-center gap-2"
                style={{
                  height: 42,
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: active ? 'var(--trinity-primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--trinity-fg)'
                }}
              >
                {code === 'th' ? 'ไทย' : 'English'}
              </button>
            )
          })}
        </div>
      </div>

      {/* text size */}
      <div>
        <SectionLabel>{t.text_size}</SectionLabel>
        <div
          className="flex gap-1.5"
          style={{
            background: '#fff',
            border: '1px solid var(--trinity-border)',
            borderRadius: 8,
            padding: 6
          }}
        >
          {FONT_SIZES.map((fs) => {
            const active = Math.abs(fontScale - fs.scale) < 0.01
            return (
              <button
                key={fs.scale}
                type="button"
                onClick={() => setFontScale(fs.scale)}
                className="flex flex-1 flex-col items-center justify-center"
                style={{
                  height: 56,
                  borderRadius: 4,
                  gap: 3,
                  cursor: 'pointer',
                  background: active ? 'var(--trinity-primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--trinity-fg)',
                  border: `1px solid ${active ? 'var(--trinity-primary)' : 'var(--trinity-border)'}`
                }}
              >
                <span style={{ fontWeight: 600, lineHeight: 1, fontSize: fs.glyph }}>
                  {lang === 'th' ? 'ก' : 'A'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 500 }}>{t[fs.labelKey]}</span>
              </button>
            )
          })}
        </div>
        <div
          style={{
            marginTop: 8,
            background: '#fff',
            border: '1px solid var(--trinity-border)',
            borderRadius: 8,
            padding: '13px 14px'
          }}
        >
          <div style={{ zoom: fontScale }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--trinity-fg)' }}>
              {t.text_size_sample_t}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--trinity-mfg)',
                marginTop: 3,
                lineHeight: 1.5
              }}
            >
              {t.text_size_sample_b}
            </div>
          </div>
        </div>
      </div>

      {/* device binding */}
      <div>
        <SectionLabel>{t.device_binding}</SectionLabel>
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--trinity-border)',
            borderRadius: 8,
            padding: 14
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--trinity-success-bg)'
              }}
            >
              <ShieldCheck size={18} style={{ color: 'var(--trinity-success)' }} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.bound_title}</div>
              <div style={{ fontSize: 11, color: 'var(--trinity-mfg)' }}>{t.bound_sub}</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 11,
              background: 'var(--trinity-muted)',
              borderRadius: 8,
              padding: '9px 11px',
              fontSize: 11,
              fontFamily: 'ui-monospace, Menlo, monospace',
              color: '#475569',
              wordBreak: 'break-all'
            }}
          >
            {maskToken(deviceToken)}
          </div>
        </div>
      </div>

      {/* session */}
      <div
        className="flex items-center gap-3"
        style={{
          background: '#fff',
          border: '1px solid var(--trinity-border)',
          borderRadius: 8,
          padding: 14
        }}
      >
        <Clock size={18} style={{ color: 'var(--trinity-mfg)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.session}</div>
          <div style={{ fontSize: 11, color: 'var(--trinity-mfg)' }}>{t.session_info}</div>
        </div>
      </div>

      {/* logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center justify-center gap-2"
        style={{
          height: 48,
          borderRadius: 4,
          border: '1px solid var(--trinity-danger)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--trinity-danger)',
          cursor: 'pointer',
          background: 'transparent'
        }}
      >
        <LogOut size={18} />
        {t.logout}
      </button>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--trinity-mfg2)' }}>
        Trinity AD · Staff App · {APP_VERSION}
      </div>
    </div>
  )
}
