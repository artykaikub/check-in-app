import type { User } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { badRequest, forbidden, notFound } from '../../core/errors/http-error.js'
import { requireSupabaseAdmin } from '../../core/supabase/require-admin-client.js'

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
  role_id: string
  is_active: boolean
  roles?: RoleRow | RoleRow[] | null
}

type PermissionRow = {
  permissions?: { key: string } | { key: string }[] | null
}

type UserPermissionRow = {
  effect: 'ALLOW' | 'DENY'
  permissions?: { key: string } | { key: string }[] | null
}

export type AppProfile = {
  id: string
  email: string | null
  fullName: string | null
  employeeCode: string | null
  isActive: boolean
  role: {
    id: string
    key: string
    name: string
  }
  permissions: string[]
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function getPermissionKey(row: PermissionRow | UserPermissionRow): string | null {
  return first(row.permissions)?.key ?? null
}

async function getDefaultRoleId() {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('key', 'USER')
    .maybeSingle()

  if (error || !data) {
    throw badRequest(error?.message ?? 'Default USER role is missing')
  }

  return data.id as string
}

export async function ensureProfileForAuthUser(user: User): Promise<void> {
  const supabaseAdmin = requireSupabaseAdmin()
  const roleId = await getDefaultRoleId()
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name:
          typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : null,
        role_id: roleId
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )

  if (error) {
    throw badRequest(error.message)
  }
}

export async function getProfileByUserId(userId: string): Promise<AppProfile> {
  const supabaseAdmin = requireSupabaseAdmin()
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id,email,full_name,employee_code,role_id,is_active,roles(id,key,name)')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw badRequest(error.message)
  }

  if (!profile) {
    throw notFound('User profile was not found')
  }

  const profileRow = profile as ProfileRow

  if (!profileRow.is_active) {
    throw forbidden('User profile is inactive')
  }

  const role = first(profileRow.roles)

  if (!role) {
    throw badRequest('User role is missing')
  }

  const [{ data: rolePermissions, error: rolePermissionsError }, { data: userPermissions, error: userPermissionsError }] =
    await Promise.all([
      supabaseAdmin
        .from('role_permissions')
        .select('permissions(key)')
        .eq('role_id', profileRow.role_id),
      supabaseAdmin
        .from('user_permissions')
        .select('effect,permissions(key)')
        .eq('user_id', userId)
    ])

  if (rolePermissionsError) {
    throw badRequest(rolePermissionsError.message)
  }

  if (userPermissionsError) {
    throw badRequest(userPermissionsError.message)
  }

  const permissionSet = new Set(
    ((rolePermissions ?? []) as PermissionRow[])
      .map(getPermissionKey)
      .filter((permission): permission is string => Boolean(permission))
  )

  for (const userPermission of (userPermissions ?? []) as UserPermissionRow[]) {
    const permissionKey = getPermissionKey(userPermission)

    if (!permissionKey) {
      continue
    }

    if (userPermission.effect === 'DENY') {
      permissionSet.delete(permissionKey)
      continue
    }

    permissionSet.add(permissionKey)
  }

  return {
    id: profileRow.id,
    email: profileRow.email,
    fullName: profileRow.full_name,
    employeeCode: profileRow.employee_code,
    isActive: profileRow.is_active,
    role: {
      id: role.id,
      key: role.key,
      name: role.name
    },
    permissions: Array.from(permissionSet).sort()
  }
}

export async function getProfileForAuthUser(user: User): Promise<AppProfile> {
  try {
    return await getProfileByUserId(user.id)
  } catch (error) {
    if (error instanceof Error && error.message === 'User profile was not found') {
      await ensureProfileForAuthUser(user)
      return getProfileByUserId(user.id)
    }

    throw error
  }
}

export function hasAnyPermission(profile: AppProfile, permissionKeys: readonly string[]) {
  return permissionKeys.some((permission) => profile.permissions.includes(permission))
}

export function createDeviceUuid() {
  return randomUUID()
}
