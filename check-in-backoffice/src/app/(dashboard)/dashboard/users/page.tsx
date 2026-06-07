import { PageHeading } from '@/components/layout/page-heading'
import { UsersTable } from '@/features/users/users-table'

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeading titleKey="users.title" />
      </div>
      <UsersTable />
    </div>
  )
}
