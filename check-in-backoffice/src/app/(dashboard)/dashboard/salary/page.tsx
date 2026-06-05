import { DashboardShell } from '@/components/layout/dashboard-shell'
import { SalaryPage } from '@/features/salary/salary-page'

export default function DashboardSalaryPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Salary</h1>
        </div>
        <SalaryPage />
      </div>
    </DashboardShell>
  )
}
