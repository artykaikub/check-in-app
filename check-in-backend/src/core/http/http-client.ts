import { fetch as undiciFetch, request } from 'undici'

export const httpClient = {
  fetch: undiciFetch,
  request
}
