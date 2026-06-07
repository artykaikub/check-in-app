'use client'

import { Globe } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useI18n, type Locale } from '@/lib/i18n'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <Globe className="size-4" />
      <span className="sr-only">{t('language.label')}</span>
      <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
        <SelectTrigger
          className="h-8 w-28 text-xs"
          aria-label={t('language.label')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t('language.en')}</SelectItem>
          <SelectItem value="th">{t('language.th')}</SelectItem>
        </SelectContent>
      </Select>
    </label>
  )
}
