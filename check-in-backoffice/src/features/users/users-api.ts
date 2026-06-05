import { fetchJson } from '@/lib/api/fetch-json'
import type { BackofficeUser, ListUsersResponse } from '@/generated/api/model'

export type { BackofficeUser, ListUsersResponse }

export function listUsers(params: { page?: number; perPage?: number } = {}) {
  const searchParams = new URLSearchParams()

  if (params.page) {
    searchParams.set('page', String(params.page))
  }

  if (params.perPage) {
    searchParams.set('perPage', String(params.perPage))
  }

  const queryString = searchParams.toString()
  return fetchJson<ListUsersResponse>(
    `/api/backoffice/users${queryString ? `?${queryString}` : ''}`
  )
}
