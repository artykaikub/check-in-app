import { badRequest, notFound } from '../../core/errors/http-error.js'
import { requireSupabaseAdmin } from '../../core/supabase/require-admin-client.js'
import { writeAuditLog, writeEventLog } from '../logs/logs.service.js'
import type {
  CreateEmergencyRequest,
  ListEmergencyLogsQuery,
  UpdateEmergencyLogRequest
} from './emergency.schemas.js'
import type { Context } from 'hono'
import type { AppEnv } from '../../types/hono.js'

type EmergencyLogRow = {
  id: string
  user_id: string
  lat: number | string
  lng: number | string
  emergency_type: string | null
  message: string | null
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
  triggered_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  handled_by: string | null
  created_at: string
}

function mapEmergencyLog(row: EmergencyLogRow) {
  return {
    id: row.id,
    userId: row.user_id,
    lat: Number(row.lat),
    lng: Number(row.lng),
    emergencyType: row.emergency_type,
    message: row.message,
    status: row.status,
    triggeredAt: row.triggered_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    handledBy: row.handled_by,
    createdAt: row.created_at
  }
}

const emergencySelect =
  'id,user_id,lat,lng,emergency_type,message,status,triggered_at,acknowledged_at,resolved_at,handled_by,created_at'

export async function createEmergencyLog(input: {
  userId: string
  payload: CreateEmergencyRequest
  c?: Context<AppEnv> | undefined
}) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('emergency_logs')
    .insert({
      user_id: input.userId,
      lat: input.payload.lat,
      lng: input.payload.lng,
      emergency_type: input.payload.emergencyType ?? null,
      message: input.payload.message ?? null,
      triggered_at: input.payload.triggeredAt ?? new Date().toISOString()
    })
    .select(emergencySelect)
    .single()

  if (error || !data) {
    throw badRequest(error?.message ?? 'Unable to create emergency log')
  }

  await writeEventLog({
    actorUserId: input.userId,
    eventType: 'emergency.created',
    severity: 'WARN',
    resourceType: 'emergency_log',
    resourceId: (data as EmergencyLogRow).id,
    metadata: {
      lat: input.payload.lat,
      lng: input.payload.lng,
      emergencyType: input.payload.emergencyType ?? null
    },
    c: input.c
  })

  return { emergencyLog: mapEmergencyLog(data as EmergencyLogRow) }
}

export async function listEmergencyLogs(query: ListEmergencyLogsQuery) {
  const supabaseAdmin = requireSupabaseAdmin()
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1

  let request = supabaseAdmin
    .from('emergency_logs')
    .select(emergencySelect, { count: 'exact' })
    .order('triggered_at', { ascending: false })
    .range(from, to)

  if (query.status) {
    request = request.eq('status', query.status)
  }

  if (query.userId) {
    request = request.eq('user_id', query.userId)
  }

  const { data, error, count } = await request

  if (error) {
    throw badRequest(error.message)
  }

  return {
    emergencyLogs: ((data ?? []) as EmergencyLogRow[]).map(mapEmergencyLog),
    page: query.page,
    perPage: query.perPage,
    total: count ?? 0
  }
}

export async function getEmergencyLog(emergencyLogId: string) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('emergency_logs')
    .select(emergencySelect)
    .eq('id', emergencyLogId)
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  if (!data) {
    throw notFound('Emergency log was not found')
  }

  return { emergencyLog: mapEmergencyLog(data as EmergencyLogRow) }
}

export async function updateEmergencyLog(input: {
  emergencyLogId: string
  payload: UpdateEmergencyLogRequest
  handledBy: string
  c?: Context<AppEnv> | undefined
}) {
  const supabaseAdmin = requireSupabaseAdmin()
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status: input.payload.status,
    handled_by: input.handledBy,
    metadata: {
      note: input.payload.note ?? null
    }
  }

  if (input.payload.status === 'ACKNOWLEDGED') {
    updates.acknowledged_at = now
  }

  if (input.payload.status === 'RESOLVED') {
    updates.resolved_at = now
  }

  const { data, error } = await supabaseAdmin
    .from('emergency_logs')
    .update(updates)
    .eq('id', input.emergencyLogId)
    .select(emergencySelect)
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  if (!data) {
    throw notFound('Emergency log was not found')
  }

  await writeAuditLog({
    actorUserId: input.handledBy,
    action: 'emergency.update',
    resourceType: 'emergency_log',
    resourceId: input.emergencyLogId,
    metadata: {
      status: input.payload.status,
      note: input.payload.note ?? null
    },
    c: input.c
  })

  return { emergencyLog: mapEmergencyLog(data as EmergencyLogRow) }
}
