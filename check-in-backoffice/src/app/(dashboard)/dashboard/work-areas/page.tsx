import { DashboardShell } from '@/components/layout/dashboard-shell'
import { WorkAreasPage } from '@/features/work-areas/work-areas-page'

export default function DashboardWorkAreasPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work areas</h1>
        </div>
        <WorkAreasPage />
      </div>
    </DashboardShell>
  )
}
