import { DashboardShell } from '@/components/layout/dashboard-shell'
import { EmergencyPage } from '@/features/emergency/emergency-page'

export default function DashboardEmergencyPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emergency</h1>
        </div>
        <EmergencyPage />
      </div>
    </DashboardShell>
  )
}
