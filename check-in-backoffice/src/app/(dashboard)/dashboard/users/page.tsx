import { DashboardShell } from '@/components/layout/dashboard-shell'
import { UsersTable } from '@/features/users/users-table'

export default function UsersPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        </div>
        <UsersTable />
      </div>
    </DashboardShell>
  )
}
