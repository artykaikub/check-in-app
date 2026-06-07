import { Alert, AlertDescription } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/api/errors'

export function ErrorBanner({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{getErrorMessage(error)}</AlertDescription>
    </Alert>
  )
}
