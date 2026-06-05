import type { Context } from 'hono'
import { requireSupabaseAdmin } from '../../core/supabase/require-admin-client.js'
import type { AppEnv } from '../../types/hono.js'

type LogContext = Pick<Context<AppEnv>, 'req' | 'get'>

function getRequestMetadata(c?: LogContext) {
  if (!c) {
    return {}
  }

  return {
    requestId: c.get('requestId'),
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: c.req.header('user-agent') ?? null
  }
}

export async function writeAuditLog(input: {
  actorUserId?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  metadata?: Record<string, unknown>
  c?: LogContext | undefined
}) {
  const supabaseAdmin = requireSupabaseAdmin()
  const requestMetadata = getRequestMetadata(input.c)
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    ip_address: 'ipAddress' in requestMetadata ? requestMetadata.ipAddress : null,
    user_agent: 'userAgent' in requestMetadata ? requestMetadata.userAgent : null,
    metadata: {
      ...input.metadata,
      requestId: 'requestId' in requestMetadata ? requestMetadata.requestId : undefined
    }
  })

  if (error) {
    input.c?.get('logger').warn({ error }, 'Unable to write audit log')
  }
}

export async function writeEventLog(input: {
  actorUserId?: string | null
  eventType: string
  severity?: 'INFO' | 'WARN' | 'ERROR'
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown>
  c?: LogContext | undefined
}) {
  const supabaseAdmin = requireSupabaseAdmin()
  const requestMetadata = getRequestMetadata(input.c)
  const { error } = await supabaseAdmin.from('event_logs').insert({
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    severity: input.severity ?? 'INFO',
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    metadata: {
      ...input.metadata,
      requestId: 'requestId' in requestMetadata ? requestMetadata.requestId : undefined
    }
  })

  if (error) {
    input.c?.get('logger').warn({ error }, 'Unable to write event log')
  }
}
