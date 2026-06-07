import { PageHeading } from '@/components/layout/page-heading'
import { EmergencyPage } from '@/features/emergency/emergency-page'

export default function DashboardEmergencyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeading titleKey="emergency.title" />
      </div>
      <EmergencyPage />
    </div>
  )
}
