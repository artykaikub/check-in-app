'use client'

import { useI18n } from '@/lib/i18n'

export function PageHeading({ titleKey }: { titleKey: string }) {
  const { t } = useI18n()

  return <h1 className="text-2xl font-semibold tracking-tight">{t(titleKey)}</h1>
}
