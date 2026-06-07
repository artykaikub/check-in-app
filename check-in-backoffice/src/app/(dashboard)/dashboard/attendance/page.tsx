import { PageHeading } from '@/components/layout/page-heading'
import { AttendancePage } from '@/features/attendance/attendance-page'

export default function DashboardAttendancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeading titleKey="attendance.title" />
      </div>
      <AttendancePage />
    </div>
  )
}
