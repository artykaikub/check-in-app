'use client'

import { ArrowLeft, Download, Eye, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { SalaryRecord } from '@/generated/api/model'
import { useI18n } from '@/lib/i18n/i18n-provider'
import { useShell } from '@/lib/shell/shell-provider'
import {
  formatBaht,
  monthLabel,
  payslipLines,
  periodRangeLabel
} from '@/features/payslip/payslip-utils'

/**
 * View-only payslip viewer overlay (`<!-- ===== PAYSLIP VIEWER ===== -->`).
 *
 * Prop-driven: the payslip page owns the selected record and passes it in, so
 * the slip never leaves React state and download/share stay disabled. Renders a
 * dark full-bleed sheet over the app with a watermarked A-page slip, a
 * confidentiality disclaimer, and a "view only" footer. The download glyph is
 * intentionally inert (no handler, dimmed).
 */
export function PayslipViewer({
  record,
  employeeName,
  employeeId,
  onClose
}: {
  record: SalaryRecord | null
  employeeName: string
  employeeId: string
  onClose: () => void
}) {
  const { t, lang } = useI18n()
  const { fontScale } = useShell()

  // Watermark capture: "Viewed · <name> · <timestamp>", frozen per open.
  const [viewedAt, setViewedAt] = useState('')
  useEffect(() => {
    if (record) {
      setViewedAt(
        new Date().toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      )
    }
  }, [record, lang])

  const lines = useMemo(
    () => (record ? payslipLines(record, t) : []),
    [record, t]
  )
  const watermarkTiles = useMemo(
    () => Array.from({ length: 18 }, () => `${employeeName} · ${employeeId}`),
    [employeeName, employeeId]
  )

  if (!record) {
    return null
  }

  const month = monthLabel(record.periodMonth, lang)
  const sub = periodRangeLabel(record.periodMonth, lang)
  const watermarkLine = `${t.watermark_viewed} · ${employeeName} · ${viewedAt}`

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ zIndex: 85, background: '#171a20', animation: 'rm-fade .2s ease' }}
    >
      {/* header */}
      <div
        className="flex items-center gap-3"
        style={{ padding: '54px 16px 11px', color: '#fff', background: '#0d0e11' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.cancel}
          className="flex items-center"
          style={{ cursor: 'pointer', background: 'transparent', border: 'none', color: '#fff' }}
        >
          <ArrowLeft size={23} />
        </button>
        <div className="flex-1">
          <div style={{ fontSize: 14, fontWeight: 600 }}>{month}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{sub}</div>
        </div>
        {/* download intentionally disabled — view-only document */}
        <Download size={20} style={{ opacity: 0.35 }} aria-hidden />
      </div>

      {/* disclaimer banner */}
      <div
        className="flex items-start gap-2"
        style={{
          background: '#3a2b00',
          color: '#ffe08a',
          padding: '9px 16px',
          fontSize: 11,
          lineHeight: '16px'
        }}
      >
        <Lock size={14} style={{ flex: 'none', marginTop: 1 }} aria-hidden />
        <span>{t.disclaimer}</span>
      </div>

      {/* scrollable slip */}
      <div
        className="rm-scroll flex flex-1 justify-center overflow-y-auto"
        style={{ padding: 16, zoom: fontScale }}
      >
        <div
          className="relative w-full"
          style={{
            maxWidth: 330,
            background: '#fff',
            borderRadius: 6,
            padding: '22px 20px',
            boxShadow: '0 10px 30px rgba(0,0,0,.4)',
            overflow: 'hidden'
          }}
        >
          {/* watermark tiles */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-wrap content-center justify-center"
            style={{
              gap: '6px 18px',
              transform: 'rotate(-28deg) scale(1.4)',
              opacity: 0.09
            }}
            aria-hidden
          >
            {watermarkTiles.map((text, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: '#0b1220'
                }}
              >
                {text}
              </div>
            ))}
          </div>

          <div className="relative">
            {/* letterhead */}
            <div
              className="flex items-center justify-between"
              style={{ borderBottom: '2px solid var(--trinity-primary)', paddingBottom: 11 }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#171a20' }}>Trinity AD</div>
                <div style={{ fontSize: 9, color: 'var(--trinity-mfg)' }}>{t.payslip_doc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--trinity-mfg)' }}>{t.period}</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{sub}</div>
              </div>
            </div>

            {/* employee row */}
            <div
              className="flex justify-between"
              style={{ marginTop: 11, fontSize: 10.5 }}
            >
              <div>
                <div style={{ color: 'var(--trinity-mfg)' }}>{t.emp_name}</div>
                <div style={{ fontWeight: 600, marginTop: 1 }}>{employeeName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--trinity-mfg)' }}>{t.emp_id}</div>
                <div style={{ fontWeight: 600, marginTop: 1 }}>{employeeId}</div>
              </div>
            </div>

            {/* line items */}
            <div style={{ marginTop: 14 }}>
              {lines.map((ln, i) => (
                <div
                  key={i}
                  className="flex justify-between"
                  style={{
                    padding: '7px 0',
                    borderBottom: '1px solid var(--trinity-muted)',
                    fontSize: 11.5
                  }}
                >
                  <span style={{ color: ln.color }}>{ln.label}</span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: ln.color
                    }}
                  >
                    {ln.amt}
                  </span>
                </div>
              ))}
            </div>

            {/* net pay */}
            <div
              className="flex items-center justify-between"
              style={{
                marginTop: 12,
                background: 'var(--trinity-success-bg)',
                borderRadius: 8,
                padding: '11px 13px'
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--trinity-success)' }}>
                {t.net_pay}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--trinity-success)',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {formatBaht(record.netSalary)}
              </span>
            </div>

            <div
              style={{
                marginTop: 14,
                textAlign: 'center',
                fontSize: 9,
                color: 'var(--trinity-mfg2)'
              }}
            >
              {watermarkLine}
            </div>
          </div>
        </div>
      </div>

      {/* view-only footer */}
      <div
        className="flex items-center justify-center gap-2"
        style={{
          background: '#0d0e11',
          color: 'rgba(255,255,255,.55)',
          padding: '11px 16px 24px',
          fontSize: 11
        }}
      >
        <Eye size={14} aria-hidden />
        {t.view_only}
      </div>
    </div>
  )
}

export default PayslipViewer
