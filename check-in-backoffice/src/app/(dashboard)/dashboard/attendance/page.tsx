import { DashboardShell } from '@/components/layout/dashboard-shell'
import { AttendancePage } from '@/features/attendance/attendance-page'

export default function DashboardAttendancePage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        </div>
        <AttendancePage />
      </div>
    </DashboardShell>
  )
}
