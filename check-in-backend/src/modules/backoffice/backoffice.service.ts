import { badRequest, notFound } from '../../core/errors/http-error.js'
import { requireSupabaseAdmin } from '../../core/supabase/require-admin-client.js'
import { getActiveDeviceBinding, resetDeviceBinding } from '../auth/device.service.js'
import { writeAuditLog } from '../logs/logs.service.js'
import type { Context } from 'hono'
import type { AppEnv } from '../../types/hono.js'
import type {
  CreateWorkLocationRequest,
  ListUsersQuery,
  SetEmployeeWorkAreaRequest,
  UpdateWorkLocationRequest
} from './backoffice.schemas.js'

type RoleRow = {
  id: string
  key: string
  name: string
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  employee_code: string | null
  is_active: boolean
  created_at: string | null
  roles?: RoleRow | RoleRow[] | null
}

type WorkLocationRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

type EmployeeWorkAreaRow = {
  id: string
  user_id: string
  work_location_id: string
  area_nodes: Array<{ lat: number; lng: number }>
  is_active: boolean
  created_at: string
  updated_at: string
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function mapRole(row: RoleRow) {
  return {
    id: row.id,
    key: row.key,
    name: row.name
  }
}

function mapUser(row: ProfileRow) {
  const role = first(row.roles)

  if (!role) {
    throw badRequest(`Role is missing for user ${row.id}`)
  }

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    employeeCode: row.employee_code,
    role: mapRole(role),
    isActive: row.is_active,
    createdAt: row.created_at
  }
}

function mapDevice(row: Awaited<ReturnType<typeof getActiveDeviceBinding>>) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    userId: row.user_id,
    deviceUuid: row.device_uuid,
    isActive: row.is_active,
    boundAt: row.bound_at,
    resetAt: row.reset_at
  }
}

function mapWorkLocation(row: WorkLocationRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at
  }
}

function mapWorkArea(row: EmployeeWorkAreaRow) {
  return {
    id: row.id,
    userId: row.user_id,
    workLocationId: row.work_location_id,
    areaNodes: row.area_nodes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listUsers(query: ListUsersQuery) {
  const supabaseAdmin = requireSupabaseAdmin()
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1

  let request = supabaseAdmin
    .from('profiles')
    .select('id,email,full_name,employee_code,is_active,created_at,roles(id,key,name)', {
      count: 'exact'
    })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (query.search) {
    request = request.or(
      `email.ilike.%${query.search}%,full_name.ilike.%${query.search}%,employee_code.ilike.%${query.search}%`
    )
  }

  const { data, error, count } = await request

  if (error) {
    throw badRequest(error.message)
  }

  return {
    users: ((data ?? []) as ProfileRow[]).map(mapUser),
    page: query.page,
    perPage: query.perPage,
    total: count ?? 0
  }
}

export async function listRoles() {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('id,key,name')
    .order('key', { ascending: true })

  if (error) {
    throw badRequest(error.message)
  }

  return { roles: ((data ?? []) as RoleRow[]).map(mapRole) }
}

export async function listPermissions() {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('permissions')
    .select('id,key,name')
    .order('key', { ascending: true })

  if (error) {
    throw badRequest(error.message)
  }

  return {
    permissions: ((data ?? []) as Array<{ id: string; key: string; name: string }>).map(
      (permission) => ({
        id: permission.id,
        key: permission.key,
        name: permission.name
      })
    )
  }
}

export async function getUserDevice(userId: string) {
  return { device: mapDevice(await getActiveDeviceBinding(userId)) }
}

export async function resetUserDevice(input: {
  userId: string
  resetBy: string
  reason?: string | undefined
  c?: Context<AppEnv> | undefined
}) {
  return resetDeviceBinding(input)
}

export async function listWorkLocations() {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('work_locations')
    .select('id,name,description,is_active,created_at')
    .order('name', { ascending: true })

  if (error) {
    throw badRequest(error.message)
  }

  return { workLocations: ((data ?? []) as WorkLocationRow[]).map(mapWorkLocation) }
}

export async function createWorkLocation(input: {
  payload: CreateWorkLocationRequest
  actorUserId: string
  c?: Context<AppEnv> | undefined
}) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('work_locations')
    .insert({
      name: input.payload.name,
      description: input.payload.description ?? null,
      is_active: input.payload.isActive,
      created_by: input.actorUserId
    })
    .select('id,name,description,is_active,created_at')
    .single()

  if (error || !data) {
    throw badRequest(error?.message ?? 'Unable to create work location')
  }

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: 'work_location.create',
    resourceType: 'work_location',
    resourceId: (data as WorkLocationRow).id,
    metadata: { name: input.payload.name },
    c: input.c
  })

  return { workLocation: mapWorkLocation(data as WorkLocationRow) }
}

export async function updateWorkLocation(input: {
  workLocationId: string
  payload: UpdateWorkLocationRequest
  actorUserId: string
  c?: Context<AppEnv> | undefined
}) {
  const supabaseAdmin = requireSupabaseAdmin()
  const updates: Record<string, unknown> = {}

  if (input.payload.name !== undefined) {
    updates.name = input.payload.name
  }

  if (input.payload.description !== undefined) {
    updates.description = input.payload.description
  }

  if (input.payload.isActive !== undefined) {
    updates.is_active = input.payload.isActive
  }

  const { data, error } = await supabaseAdmin
    .from('work_locations')
    .update(updates)
    .eq('id', input.workLocationId)
    .select('id,name,description,is_active,created_at')
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  if (!data) {
    throw notFound('Work location was not found')
  }

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: 'work_location.update',
    resourceType: 'work_location',
    resourceId: input.workLocationId,
    metadata: { updates },
    c: input.c
  })

  return { workLocation: mapWorkLocation(data as WorkLocationRow) }
}

export async function getUserWorkArea(userId: string) {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('employee_work_areas')
    .select('id,user_id,work_location_id,area_nodes,is_active,created_at,updated_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  return { workArea: data ? mapWorkArea(data as EmployeeWorkAreaRow) : null }
}

export async function setUserWorkArea(input: {
  userId: string
  payload: SetEmployeeWorkAreaRequest
  actorUserId: string
  c?: Context<AppEnv> | undefined
}) {
  const supabaseAdmin = requireSupabaseAdmin()
  const existing = await getUserWorkArea(input.userId)

  const values = {
    user_id: input.userId,
    work_location_id: input.payload.workLocationId,
    area_nodes: input.payload.areaNodes,
    is_active: input.payload.isActive,
    created_by: input.actorUserId
  }

  const request = existing.workArea
    ? supabaseAdmin
        .from('employee_work_areas')
        .update(values)
        .eq('id', existing.workArea.id)
    : supabaseAdmin.from('employee_work_areas').insert(values)

  const { data, error } = await request
    .select('id,user_id,work_location_id,area_nodes,is_active,created_at,updated_at')
    .single()

  if (error || !data) {
    throw badRequest(error?.message ?? 'Unable to set employee work area')
  }

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: existing.workArea ? 'work_area.update' : 'work_area.create',
    resourceType: 'employee_work_area',
    resourceId: (data as EmployeeWorkAreaRow).id,
    metadata: {
      userId: input.userId,
      workLocationId: input.payload.workLocationId
    },
    c: input.c
  })

  return { workArea: mapWorkArea(data as EmployeeWorkAreaRow) }
}
