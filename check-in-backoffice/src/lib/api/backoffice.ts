import { fetchJson } from './fetch-json'
import type {
  AttendanceDayResponse,
  CreateSalaryUploadUrlRequest,
  CreateSalaryUploadUrlResponse,
  CreateWorkLocationRequest,
  EmergencyLogResponse,
  EmployeeWorkAreaResponse,
  ImportSalaryRequest,
  ImportSalaryResponse,
  ListAttendanceParams,
  ListAttendanceResponse,
  ListBackofficeUsersParams,
  ListEmergencyLogsParams,
  ListEmergencyLogsResponse,
  ListSalaryRecordsParams,
  ListSalaryRecordsResponse,
  ListSalaryUploadsParams,
  ListSalaryUploadsResponse,
  ListUsersResponse,
  ListWorkLocationsResponse,
  ResetDeviceResponse,
  ReviewAttendanceRequest,
  SetEmployeeWorkAreaRequest,
  UpdateEmergencyLogRequest,
  UpdateWorkLocationRequest,
  WorkLocationResponse
} from '@/generated/api/model'

function withQuery(path: string, params?: Record<string, unknown>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  }

  const queryString = searchParams.toString()
  return queryString ? `${path}?${queryString}` : path
}

export function listUsers(params: ListBackofficeUsersParams = {}) {
  return fetchJson<ListUsersResponse>(withQuery('/api/backoffice/users', params))
}

export function resetUserDevice(userId: string, reason?: string) {
  return fetchJson<ResetDeviceResponse>(`/api/backoffice/users/${userId}/device/reset`, {
    method: 'POST',
    body: reason ? { reason } : {}
  })
}

export function listWorkLocations() {
  return fetchJson<ListWorkLocationsResponse>('/api/backoffice/work-locations')
}

export function createWorkLocation(payload: CreateWorkLocationRequest) {
  return fetchJson<WorkLocationResponse>('/api/backoffice/work-locations', {
    method: 'POST',
    body: payload
  })
}

export function updateWorkLocation(workLocationId: string, payload: UpdateWorkLocationRequest) {
  return fetchJson<WorkLocationResponse>(`/api/backoffice/work-locations/${workLocationId}`, {
    method: 'PATCH',
    body: payload
  })
}

export function getUserWorkArea(userId: string) {
  return fetchJson<EmployeeWorkAreaResponse>(`/api/backoffice/users/${userId}/work-area`)
}

export function setUserWorkArea(userId: string, payload: SetEmployeeWorkAreaRequest) {
  return fetchJson<EmployeeWorkAreaResponse>(`/api/backoffice/users/${userId}/work-area`, {
    method: 'PUT',
    body: payload
  })
}

export function listAttendance(params: ListAttendanceParams = {}) {
  return fetchJson<ListAttendanceResponse>(withQuery('/api/backoffice/attendance', params))
}

export function getAttendanceDay(attendanceDayId: string) {
  return fetchJson<AttendanceDayResponse>(`/api/backoffice/attendance/${attendanceDayId}`)
}

export function reviewAttendance(attendanceDayId: string, payload: ReviewAttendanceRequest) {
  return fetchJson<AttendanceDayResponse>(`/api/backoffice/attendance/${attendanceDayId}/review`, {
    method: 'PATCH',
    body: payload
  })
}

export function listEmergencyLogs(params: ListEmergencyLogsParams = {}) {
  return fetchJson<ListEmergencyLogsResponse>(withQuery('/api/backoffice/emergency-logs', params))
}

export function getEmergencyLog(emergencyLogId: string) {
  return fetchJson<EmergencyLogResponse>(`/api/backoffice/emergency-logs/${emergencyLogId}`)
}

export function updateEmergencyLog(emergencyLogId: string, payload: UpdateEmergencyLogRequest) {
  return fetchJson<EmergencyLogResponse>(`/api/backoffice/emergency-logs/${emergencyLogId}`, {
    method: 'PATCH',
    body: payload
  })
}

export function createSalaryUploadUrl(payload: CreateSalaryUploadUrlRequest) {
  return fetchJson<CreateSalaryUploadUrlResponse>('/api/backoffice/salary/upload-url', {
    method: 'POST',
    body: payload
  })
}

export function importSalaryUpload(payload: ImportSalaryRequest) {
  return fetchJson<ImportSalaryResponse>('/api/backoffice/salary/import', {
    method: 'POST',
    body: payload
  })
}

export function listSalaryUploads(params: ListSalaryUploadsParams = {}) {
  return fetchJson<ListSalaryUploadsResponse>(withQuery('/api/backoffice/salary/uploads', params))
}

export function listSalaryRecords(params: ListSalaryRecordsParams = {}) {
  return fetchJson<ListSalaryRecordsResponse>(withQuery('/api/backoffice/salary/records', params))
}
