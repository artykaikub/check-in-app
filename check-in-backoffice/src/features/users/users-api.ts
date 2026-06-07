import { fetchJson } from '@/lib/api/fetch-json'
import { getListBackofficeUsersUrl } from '@/generated/api/backoffice/backoffice'
import type {
  BackofficeUser,
  ListBackofficeUsersParams,
  ListUsersResponse
} from '@/generated/api/model'

export type { BackofficeUser, ListUsersResponse }

export function listUsers(params: ListBackofficeUsersParams = {}) {
  return fetchJson<ListUsersResponse>(getListBackofficeUsersUrl(params))
}
