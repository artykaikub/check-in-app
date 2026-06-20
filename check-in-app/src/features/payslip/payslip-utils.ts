/**
 * Payslip presentation helpers — turn raw `SalaryRecord`s from the API into the
 * year-grouped, Buddhist-era-labelled view the prototype renders, plus the
 * line-item breakdown shown in the payslip viewer.
 *
 * The prototype hard-codes mock slips; here every value is derived from a real
 * `SalaryRecord`. `periodMonth` arrives as `YYYY-MM`.
 */
import type { Dict, Lang } from '@/lib/i18n/dictionaries'
import type { SalaryRecord } from '@/generated/api/model'

const MONTHS: Record<Lang, string[]> = {
  th: [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม'
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
}

const MONTHS_SHORT: Record<Lang, string[]> = {
  th: [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.'
  ],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Gregorian year + 543 = Buddhist-era year. */
export function toBuddhistYear(gregorian: number): number {
  return gregorian + 543
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Parses `YYYY-MM` into a 0-based month index + 4-digit gregorian year. */
function parsePeriod(periodMonth: string): { year: number; monthIndex: number } {
  const [yearStr, monthStr] = periodMonth.split('-')
  const year = Number.parseInt(yearStr, 10)
  const monthIndex = Number.parseInt(monthStr, 10) - 1
  return { year, monthIndex }
}

/** Thousands-separated Thai-baht amount, e.g. `฿18,420.00`. Negative shows `-฿…`. */
export function formatBaht(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  const body = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${sign}฿${body}`
}

/** Long month label, e.g. `มิถุนายน 2569` / `June 2026`. */
export function monthLabel(periodMonth: string, lang: Lang): string {
  const { year, monthIndex } = parsePeriod(periodMonth)
  if (Number.isNaN(year) || monthIndex < 0 || monthIndex > 11) {
    return periodMonth
  }
  const yearLabel = lang === 'th' ? toBuddhistYear(year) : year
  return `${MONTHS[lang][monthIndex]} ${yearLabel}`
}

/** Coverage sub-label, e.g. `1–30 มิ.ย. 2569` / `1–30 Jun 2026`. */
export function periodSubLabel(periodMonth: string, lang: Lang): string {
  const { year, monthIndex } = parsePeriod(periodMonth)
  if (Number.isNaN(year) || monthIndex < 0 || monthIndex > 11) {
    return periodMonth
  }
  let lastDay = DAYS_IN_MONTH[monthIndex]
  if (monthIndex === 1 && isLeapYear(year)) {
    lastDay = 29
  }
  const yearLabel = lang === 'th' ? toBuddhistYear(year) : year
  return `1–${lastDay} ${MONTHS_SHORT[lang][monthIndex]} ${yearLabel}`
}

/** Full period range used on the viewer header, identical to the sub-label. */
export function periodRangeLabel(periodMonth: string, lang: Lang): string {
  return periodSubLabel(periodMonth, lang)
}

export type PayslipView = {
  id: string
  record: SalaryRecord
  /** Long month, e.g. `June 2026`. */
  month: string
  /** Coverage range, e.g. `1–30 Jun 2026`. */
  sub: string
  /** Net pay, baht-formatted. */
  net: string
}

export type PayslipYearGroup = {
  /** Gregorian year used for sorting / dedupe. */
  key: number
  /** Display label, e.g. `2569 BE (2026)` / `2569 (2026)`. */
  label: string
  slips: PayslipView[]
}

/** Groups payslips by year (Buddhist-era label) and orders newest-first. */
export function groupPayslipsByYear(
  records: SalaryRecord[],
  lang: Lang
): PayslipYearGroup[] {
  const byYear = new Map<number, PayslipView[]>()

  for (const record of records) {
    const { year } = parsePeriod(record.periodMonth)
    if (Number.isNaN(year)) {
      continue
    }
    const view: PayslipView = {
      id: record.id,
      record,
      month: monthLabel(record.periodMonth, lang),
      sub: periodSubLabel(record.periodMonth, lang),
      net: formatBaht(record.netSalary)
    }
    const list = byYear.get(year)
    if (list) {
      list.push(view)
    } else {
      byYear.set(year, [view])
    }
  }

  return Array.from(byYear.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, slips]) => {
      const buddhist = toBuddhistYear(year)
      const label = lang === 'th' ? `${buddhist} (${year})` : `${buddhist} BE (${year})`
      return {
        key: year,
        label,
        slips: slips.sort((a, b) =>
          b.record.periodMonth.localeCompare(a.record.periodMonth)
        )
      }
    })
}

export type PayslipLine = {
  label: string
  amt: string
  /** CSS color token; deductions render in danger, the rest in ink. */
  color: string
}

/**
 * Line items for the viewer, derived from the record. Allowances and deductions
 * are only shown when non-zero; the `note` becomes a trailing memo line.
 */
export function payslipLines(record: SalaryRecord, t: Dict): PayslipLine[] {
  const ink = '#0b1220'
  const danger = 'var(--trinity-danger)'
  const lines: PayslipLine[] = [{ label: t.base_salary, amt: formatBaht(record.baseSalary), color: ink }]

  if (record.allowance) {
    lines.push({ label: t.allowance, amt: formatBaht(record.allowance), color: ink })
  }
  if (record.deduction) {
    lines.push({
      label: t.deduction,
      amt: formatBaht(-Math.abs(record.deduction)),
      color: danger
    })
  }
  if (record.note) {
    lines.push({ label: record.note, amt: '', color: 'var(--trinity-mfg)' })
  }
  return lines
}
