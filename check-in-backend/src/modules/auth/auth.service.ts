import type { Session, User } from '@supabase/supabase-js'
import type { Context } from 'hono'
import { badRequest } from '../../core/errors/http-error.js'
import { supabase } from '../../db/supabase.js'
import type { AppEnv } from '../../types/hono.js'
import { enforceDeviceBinding } from './device.service.js'
import { getProfileForAuthUser, type AppProfile } from './profile.service.js'
import type {
  RefreshTokenRequest,
  SignInRequest,
  SignUpRequest
} from './auth.schemas.js'

function toUser(profile: AppProfile) {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    employeeCode: profile.employeeCode,
    isActive: profile.isActive,
    role: profile.role,
    permissions: profile.permissions
  }
}

function toSession(session: Session | null) {
  if (!session) {
    return null
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    tokenType: session.token_type
  }
}

export async function signUp(payload: SignUpRequest) {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName
      }
    }
  })

  if (error || !data.user) {
    throw badRequest(error?.message ?? 'Unable to sign up')
  }

  const profile = await getProfileForAuthUser(data.user)

  return {
    user: toUser(profile),
    session: toSession(data.session),
    device: null
  }
}

export async function signIn(payload: SignInRequest, c?: Context<AppEnv>) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password
  })

  if (error || !data.user) {
    throw badRequest(error?.message ?? 'Unable to sign in')
  }

  const profile = await getProfileForAuthUser(data.user)
  const device = await enforceDeviceBinding({
    profile,
    clientType: payload.clientType,
    deviceUuid: payload.deviceUuid,
    c
  })

  return {
    user: toUser(profile),
    session: toSession(data.session),
    device
  }
}

export async function refreshSession(payload: RefreshTokenRequest) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: payload.refreshToken
  })

  if (error || !data.user) {
    throw badRequest(error?.message ?? 'Unable to refresh session')
  }

  const profile = await getProfileForAuthUser(data.user)

  return {
    user: toUser(profile),
    session: toSession(data.session),
    device: null
  }
}

export function mapProfile(profile: AppProfile) {
  return toUser(profile)
}
