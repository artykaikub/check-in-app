import { PageHeading } from '@/components/layout/page-heading'
import { AreaInspectionsPage } from '@/features/area-inspections/area-inspections-page'

export default function DashboardAreaInspectionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeading titleKey="areaInspections.title" />
      </div>
      <AreaInspectionsPage />
    </div>
  )
}
