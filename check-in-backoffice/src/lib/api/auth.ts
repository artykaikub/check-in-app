import { fetchJson } from './fetch-json'
import type { CurrentUserResponse } from '@/generated/api/model'

export function getAuthMe() {
  return fetchJson<CurrentUserResponse>('/api/auth/me')
}
