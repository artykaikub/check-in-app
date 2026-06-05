import { getErrorMessage } from '@/lib/api/errors'

export function ErrorBanner({ error }: { error: unknown }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {getErrorMessage(error)}
    </div>
  )
}
