export const permissions = {
  usersRead: 'users:read',
  usersCreate: 'users:create',
  usersUpdate: 'users:update',
  usersResetDevice: 'users:reset_device',
  rolesRead: 'roles:read',
  permissionsRead: 'permissions:read',
  workAreasRead: 'work_areas:read',
  workAreasManage: 'work_areas:manage',
  attendanceRead: 'attendance:read',
  attendanceReview: 'attendance:review',
  salaryRead: 'salary:read',
  salaryUpload: 'salary:upload',
  logsRead: 'logs:read',
  emergencyRead: 'emergency:read',
  emergencyUpdate: 'emergency:update',
  mobileAttendance: 'mobile:attendance',
  mobileEmergency: 'mobile:emergency'
} as const

export type PermissionKey = (typeof permissions)[keyof typeof permissions]

export const mobileDevicePermissions = [
  permissions.mobileAttendance,
  permissions.mobileEmergency
] as const
