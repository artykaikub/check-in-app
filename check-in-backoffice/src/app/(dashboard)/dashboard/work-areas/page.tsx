import { PageHeading } from '@/components/layout/page-heading'
import { WorkAreasPage } from '@/features/work-areas/work-areas-page'

export default function DashboardWorkAreasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeading titleKey="workAreas.title" />
      </div>
      <WorkAreasPage />
    </div>
  )
}
