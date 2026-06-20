'use client'

import { ChevronRight, FileText, Folder, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGetFrontendProfile } from '@/generated/api/frontend/frontend'
import { useListFrontendPayslips } from '@/generated/api/frontend/frontend'
import type { SalaryRecord } from '@/generated/api/model'
import { PayslipViewer } from '@/components/shell/payslip-viewer'
import { useI18n } from '@/lib/i18n/i18n-provider'
import { useAuth } from '@/lib/auth/auth-provider'
import { groupPayslipsByYear } from './payslip-utils'

/**
 * PAYSLIP screen body (`onPayslip`): privacy banner + payslips grouped by year
 * (Buddhist-era label) with each slip row opening the view-only viewer overlay.
 *
 * The viewer is rendered directly from here (not via the shell overlay slot) so
 * the selected record stays in local state and download remains disabled.
 */
export function PayslipScreen() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const payslipsQuery = useListFrontendPayslips()
  const profileQuery = useGetFrontendProfile()

  const [openRecord, setOpenRecord] = useState<SalaryRecord | null>(null)

  const profileUser = profileQuery.data?.user ?? user
  const employeeName = profileUser?.fullName ?? profileUser?.email ?? '—'
  const employeeId = profileUser?.employeeCode ?? profileUser?.id ?? '—'

  const groups = useMemo(
    () => groupPayslipsByYear(payslipsQuery.data?.payslips ?? [], lang),
    [payslipsQuery.data, lang]
  )

  const isLoading = payslipsQuery.isLoading
  const isEmpty = !isLoading && groups.length === 0

  return (
    <>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* privacy banner */}
        <div
          className="flex items-center gap-2.5"
          style={{
            background: '#fff',
            border: '1px solid var(--trinity-border)',
            borderRadius: 8,
            padding: '11px 13px'
          }}
        >
          <ShieldCheck size={17} style={{ color: 'var(--trinity-primary)', flex: 'none' }} />
          <div
            style={{
              fontSize: 11.5,
              lineHeight: '16px',
              color: 'var(--trinity-mfg)',
              flex: 1
            }}
          >
            {t.payslip_privacy}
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 66,
                  background: '#fff',
                  border: '1px solid var(--trinity-border)',
                  borderRadius: 8,
                  opacity: 0.6,
                  animation: 'rm-pulse 1.4s ease-in-out infinite'
                }}
              />
            ))}
          </div>
        ) : null}

        {isEmpty ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              background: '#fff',
              border: '1px solid var(--trinity-border)',
              borderRadius: 8,
              padding: '36px 20px',
              gap: 8
            }}
          >
            <FileText size={28} style={{ color: 'var(--trinity-mfg2)' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--trinity-fg)' }}>
              {t.payslip_empty}
            </div>
            <div style={{ fontSize: 12, color: 'var(--trinity-mfg)' }}>
              {t.payslip_empty_sub}
            </div>
          </div>
        ) : null}

        {groups.map((group) => (
          <div key={group.key}>
            <div
              className="flex items-center gap-2"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--trinity-mfg)',
                textTransform: 'uppercase',
                letterSpacing: '.5px',
                marginBottom: 9
              }}
            >
              <Folder size={15} />
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {group.slips.map((slip) => (
                <button
                  key={slip.id}
                  type="button"
                  onClick={() => setOpenRecord(slip.record)}
                  className="flex w-full items-center gap-3 text-left"
                  style={{
                    background: '#fff',
                    border: '1px solid var(--trinity-border)',
                    borderRadius: 8,
                    padding: '13px 14px',
                    cursor: 'pointer'
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--trinity-danger-bg)',
                      flex: 'none'
                    }}
                  >
                    <FileText size={19} style={{ color: 'var(--trinity-danger)' }} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span className="block" style={{ fontSize: 14, fontWeight: 600 }}>
                      {slip.month}
                    </span>
                    <span
                      className="block"
                      style={{ fontSize: 11.5, color: 'var(--trinity-mfg)', marginTop: 2 }}
                    >
                      {slip.sub}
                    </span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span
                      className="block"
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--trinity-success)',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {slip.net}
                    </span>
                    <span className="block" style={{ fontSize: 10, color: 'var(--trinity-mfg)' }}>
                      {t.net_pay}
                    </span>
                  </span>
                  <ChevronRight size={18} style={{ color: 'var(--trinity-mfg2)' }} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <PayslipViewer
        record={openRecord}
        employeeName={employeeName}
        employeeId={employeeId}
        onClose={() => setOpenRecord(null)}
      />
    </>
  )
}
