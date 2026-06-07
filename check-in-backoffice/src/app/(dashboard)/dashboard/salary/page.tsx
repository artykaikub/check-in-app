import { PageHeading } from '@/components/layout/page-heading'
import { SalaryPage } from '@/features/salary/salary-page'

export default function DashboardSalaryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeading titleKey="salary.title" />
      </div>
      <SalaryPage />
    </div>
  )
}
