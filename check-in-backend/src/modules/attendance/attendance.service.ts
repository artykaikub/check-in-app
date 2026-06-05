import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { badRequest, forbidden, notFound } from '../../core/errors/http-error.js'
import { requireSupabaseAdmin } from '../../core/supabase/require-admin-client.js'
import { writeAuditLog, writeEventLog } from '../logs/logs.service.js'
import { getBangkokDate, isPointInsidePolygon, type LatLngNode } from './geo.js'
import type {
  AttendanceEventType,
  ConfirmAttendanceRequest,
  CreateAttendanceUploadUrlRequest,
  ListAttendanceQuery,
  ReviewAttendanceRequest
} from './attendance.schemas.js'
import type { Context } from 'hono'
import type { AppEnv } from '../../types/hono.js'

type PhotoUploadRow = {
  id: string
  user_id: string
  event_type: AttendanceEventType
  storage_bucket: string
  storage_path: string
  content_type: string
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  expires_at: string
}

type EmployeeWorkAreaRow = {
  id: string
  user_id: string
  work_location_id: string
  area_nodes: LatLngNode[]
  is_active: boolean
}

type AttendanceEventRow = {
  id: string
  attendance_day_id: string
  user_id: string
  event_type: AttendanceEventType
  lat: number | string
  lng: number | string
  photo_path: string
  validation_status: 'VALID' | 'INVALID'
  validation_reason: string | null
  work_area_snapshot: {
    workAreaId: string
    workLocationId: string
    areaNodes: LatLngNode[]
  }
  captured_at: string
  created_at: string
}

type AttendanceDayRow = {
  id: string
  user_id: string
  work_date: string
  check_in_event_id: string | null
  check_out_event_id: string | null
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED'
  review_note: string | null
  created_at: string
}

function extensionFromContentType(contentType: string) {
  if (contentType === 'image/png') {
    return 'png'
  }

  if (contentType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
}

function mapEvent(row: AttendanceEventRow, photoUrl: string | null) {
  return {
    id: row.id,
    type: row.event_type,
    lat: Number(row.lat),
    lng: Number(row.lng),
    photoPath: row.photo_path,
    photoUrl,
    validationStatus: row.validation_status,
    validationReason: row.validation_reason,
    workAreaSnapshot: row.work_area_snapshot,
    capturedAt: row.captured_at,
    createdAt: row.created_at
  }
}

async function createSignedReadUrl(path?: string | null) {
  if (!path) {
    return null
  }

  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin.storage
    .from(env.ATTENDANCE_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 10)

  if (error) {
    return null
  }

  return data.signedUrl
}

async function mapAttendanceDay(
  day: AttendanceDayRow,
  events: AttendanceEventRow[] = []
) {
  const checkInEvent = events.find((event) => event.id === day.check_in_event_id) ?? null
  const checkOutEvent = events.find((event) => event.id === day.check_out_event_id) ?? null

  return {
    id: day.id,
    userId: day.user_id,
    workDate: day.work_date,
    reviewStatus: day.review_status,
    reviewNote: day.review_note,
    checkIn: checkInEvent
      ? mapEvent(checkInEvent, await createSignedReadUrl(checkInEvent.photo_path))
      : null,
    checkOut: checkOutEvent
      ? mapEvent(checkOutEvent, await createSignedReadUrl(checkOutEvent.photo_path))
      : null,
    createdAt: day.created_at
  }
}

async function getAttendanceDayForDate(userId: string, workDate: string) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('attendance_days')
    .select('id,user_id,work_date,check_in_event_id,check_out_event_id,review_status,review_note,created_at')
    .eq('user_id', userId)
    .eq('work_date', workDate)
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  return data as AttendanceDayRow | null
}

async function assertAttendanceActionAllowed(userId: string, eventType: AttendanceEventType) {
  const workDate = getBangkokDate()
  const day = await getAttendanceDayForDate(userId, workDate)

  if (eventType === 'CHECK_IN' && day?.check_in_event_id) {
    throw badRequest('Check-in already exists for today')
  }

  if (eventType === 'CHECK_OUT') {
    if (!day?.check_in_event_id) {
      throw badRequest('Check-in is required before check-out')
    }

    if (day.check_out_event_id) {
      throw badRequest('Check-out already exists for today')
    }
  }
}

async function getActiveWorkArea(userId: string) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('employee_work_areas')
    .select('id,user_id,work_location_id,area_nodes,is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  if (!data) {
    throw forbidden('Active work area is required')
  }

  return data as EmployeeWorkAreaRow
}

async function getPendingUpload(userId: string, pendingUploadId: string, eventType: AttendanceEventType) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('attendance_photo_uploads')
    .select('id,user_id,event_type,storage_bucket,storage_path,content_type,status,expires_at')
    .eq('id', pendingUploadId)
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  if (!data) {
    throw notFound('Pending attendance upload was not found')
  }

  const upload = data as PhotoUploadRow

  if (upload.status !== 'PENDING') {
    throw badRequest('Attendance upload was already used')
  }

  if (new Date(upload.expires_at).getTime() < Date.now()) {
    throw badRequest('Attendance upload expired')
  }

  return upload
}

export async function createAttendanceUploadUrl(input: {
  userId: string
  payload: CreateAttendanceUploadUrlRequest
}) {
  await assertAttendanceActionAllowed(input.userId, input.payload.type)

  const supabaseAdmin = requireSupabaseAdmin()
  const pendingUploadId = randomUUID()
  const workDate = getBangkokDate()
  const extension = extensionFromContentType(input.payload.contentType)
  const storagePath = `attendance/${input.userId}/${workDate}/${pendingUploadId}.${extension}`
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: signedUpload, error: signedUploadError } = await supabaseAdmin.storage
    .from(env.ATTENDANCE_PHOTO_BUCKET)
    .createSignedUploadUrl(storagePath)

  if (signedUploadError || !signedUpload) {
    throw badRequest(signedUploadError?.message ?? 'Unable to create signed upload URL')
  }

  const { error } = await supabaseAdmin.from('attendance_photo_uploads').insert({
    id: pendingUploadId,
    user_id: input.userId,
    event_type: input.payload.type,
    storage_bucket: env.ATTENDANCE_PHOTO_BUCKET,
    storage_path: storagePath,
    content_type: input.payload.contentType,
    expires_at: expiresAt
  })

  if (error) {
    throw badRequest(error.message)
  }

  return {
    pendingUploadId,
    storagePath,
    signedUploadUrl: signedUpload.signedUrl,
    token: signedUpload.token,
    expiresAt
  }
}

export async function confirmAttendance(input: {
  userId: string
  eventType: AttendanceEventType
  payload: ConfirmAttendanceRequest
  c?: Context<AppEnv> | undefined
}) {
  await assertAttendanceActionAllowed(input.userId, input.eventType)

  const supabaseAdmin = requireSupabaseAdmin()
  const upload = await getPendingUpload(input.userId, input.payload.pendingUploadId, input.eventType)
  const workArea = await getActiveWorkArea(input.userId)
  const point = { lat: input.payload.lat, lng: input.payload.lng }

  if (!isPointInsidePolygon(point, workArea.area_nodes)) {
    await writeEventLog({
      actorUserId: input.userId,
      eventType: 'attendance.location_rejected',
      severity: 'WARN',
      resourceType: 'employee_work_area',
      resourceId: workArea.id,
      metadata: {
        attendanceEventType: input.eventType,
        point,
        workAreaId: workArea.id
      },
      c: input.c
    })

    throw forbidden('Location is outside assigned work area')
  }

  const workDate = getBangkokDate()
  const day =
    (await getAttendanceDayForDate(input.userId, workDate)) ??
    ((
      await supabaseAdmin
        .from('attendance_days')
        .insert({
          user_id: input.userId,
          work_date: workDate
        })
        .select('id,user_id,work_date,check_in_event_id,check_out_event_id,review_status,review_note,created_at')
        .single()
    ).data as AttendanceDayRow | null)

  if (!day) {
    throw badRequest('Unable to create attendance day')
  }

  const eventInsert = await supabaseAdmin
    .from('attendance_events')
    .insert({
      attendance_day_id: day.id,
      user_id: input.userId,
      event_type: input.eventType,
      lat: input.payload.lat,
      lng: input.payload.lng,
      photo_upload_id: upload.id,
      photo_bucket: env.ATTENDANCE_PHOTO_BUCKET,
      photo_path: upload.storage_path,
      validation_status: 'VALID',
      validation_reason: null,
      work_area_snapshot: {
        workAreaId: workArea.id,
        workLocationId: workArea.work_location_id,
        areaNodes: workArea.area_nodes
      },
      captured_at: input.payload.capturedAt ?? new Date().toISOString()
    })
    .select('id,attendance_day_id,user_id,event_type,lat,lng,photo_path,validation_status,validation_reason,work_area_snapshot,captured_at,created_at')
    .single()

  if (eventInsert.error || !eventInsert.data) {
    throw badRequest(eventInsert.error?.message ?? 'Unable to create attendance event')
  }

  const event = eventInsert.data as AttendanceEventRow
  const dayUpdateColumn = input.eventType === 'CHECK_IN' ? 'check_in_event_id' : 'check_out_event_id'
  const { data: updatedDay, error: updateError } = await supabaseAdmin
    .from('attendance_days')
    .update({ [dayUpdateColumn]: event.id })
    .eq('id', day.id)
    .select('id,user_id,work_date,check_in_event_id,check_out_event_id,review_status,review_note,created_at')
    .single()

  if (updateError || !updatedDay) {
    throw badRequest(updateError?.message ?? 'Unable to update attendance day')
  }

  await supabaseAdmin
    .from('attendance_photo_uploads')
    .update({ status: 'COMPLETED' })
    .eq('id', upload.id)

  await writeEventLog({
    actorUserId: input.userId,
    eventType: input.eventType === 'CHECK_IN' ? 'attendance.check_in_created' : 'attendance.check_out_created',
    resourceType: 'attendance_event',
    resourceId: event.id,
    metadata: { workDate, point },
    c: input.c
  })

  const events = await getAttendanceEventsForDay(day.id)
  return { attendanceDay: await mapAttendanceDay(updatedDay as AttendanceDayRow, events) }
}

async function getAttendanceEventsForDay(attendanceDayId: string) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('attendance_events')
    .select('id,attendance_day_id,user_id,event_type,lat,lng,photo_path,validation_status,validation_reason,work_area_snapshot,captured_at,created_at')
    .eq('attendance_day_id', attendanceDayId)

  if (error) {
    throw badRequest(error.message)
  }

  return (data ?? []) as AttendanceEventRow[]
}

export async function listAttendance(query: ListAttendanceQuery) {
  const supabaseAdmin = requireSupabaseAdmin()
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1

  let request = supabaseAdmin
    .from('attendance_days')
    .select('id,user_id,work_date,check_in_event_id,check_out_event_id,review_status,review_note,created_at', {
      count: 'exact'
    })
    .order('work_date', { ascending: false })
    .range(from, to)

  if (query.userId) {
    request = request.eq('user_id', query.userId)
  }

  if (query.dateFrom) {
    request = request.gte('work_date', query.dateFrom)
  }

  if (query.dateTo) {
    request = request.lte('work_date', query.dateTo)
  }

  if (query.reviewStatus) {
    request = request.eq('review_status', query.reviewStatus)
  }

  const { data, error, count } = await request

  if (error) {
    throw badRequest(error.message)
  }

  const days = (data ?? []) as AttendanceDayRow[]
  const eventsByDay = new Map<string, AttendanceEventRow[]>()

  if (days.length > 0) {
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('attendance_events')
      .select('id,attendance_day_id,user_id,event_type,lat,lng,photo_path,validation_status,validation_reason,work_area_snapshot,captured_at,created_at')
      .in(
        'attendance_day_id',
        days.map((day) => day.id)
      )

    if (eventsError) {
      throw badRequest(eventsError.message)
    }

    for (const event of (events ?? []) as AttendanceEventRow[]) {
      const existing = eventsByDay.get(event.attendance_day_id) ?? []
      existing.push(event)
      eventsByDay.set(event.attendance_day_id, existing)
    }
  }

  return {
    attendanceDays: await Promise.all(
      days.map((day) => mapAttendanceDay(day, eventsByDay.get(day.id) ?? []))
    ),
    page: query.page,
    perPage: query.perPage,
    total: count ?? 0
  }
}

export async function getAttendanceDay(attendanceDayId: string) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('attendance_days')
    .select('id,user_id,work_date,check_in_event_id,check_out_event_id,review_status,review_note,created_at')
    .eq('id', attendanceDayId)
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  if (!data) {
    throw notFound('Attendance day was not found')
  }

  return {
    attendanceDay: await mapAttendanceDay(
      data as AttendanceDayRow,
      await getAttendanceEventsForDay(attendanceDayId)
    )
  }
}

export async function reviewAttendance(input: {
  attendanceDayId: string
  payload: ReviewAttendanceRequest
  reviewerId: string
  c?: Context<AppEnv> | undefined
}) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('attendance_days')
    .update({
      review_status: input.payload.reviewStatus,
      review_note: input.payload.reviewNote ?? null,
      reviewed_by: input.reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', input.attendanceDayId)
    .select('id,user_id,work_date,check_in_event_id,check_out_event_id,review_status,review_note,created_at')
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  if (!data) {
    throw notFound('Attendance day was not found')
  }

  await writeAuditLog({
    actorUserId: input.reviewerId,
    action: 'attendance.review',
    resourceType: 'attendance_day',
    resourceId: input.attendanceDayId,
    metadata: {
      reviewStatus: input.payload.reviewStatus,
      reviewNote: input.payload.reviewNote ?? null
    },
    c: input.c
  })

  return {
    attendanceDay: await mapAttendanceDay(
      data as AttendanceDayRow,
      await getAttendanceEventsForDay(input.attendanceDayId)
    )
  }
}
