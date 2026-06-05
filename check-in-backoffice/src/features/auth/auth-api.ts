import { fetchJson } from '@/lib/api/fetch-json'
import type { AuthResponse, SignInRequest } from './auth.types'

export function signIn(payload: SignInRequest) {
  return fetchJson<AuthResponse>('/api/auth/sign-in', {
    method: 'POST',
    body: payload,
    withAuth: false
  })
}
