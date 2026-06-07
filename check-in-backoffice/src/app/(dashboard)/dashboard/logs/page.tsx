import { PageHeading } from '@/components/layout/page-heading'
import { LogsPage } from '@/features/logs/logs-page'

export default function DashboardLogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeading titleKey="logs.title" />
      </div>
      <LogsPage />
    </div>
  )
}
