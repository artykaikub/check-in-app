import { clearStoredSession, getAuthorizationHeaders } from './session'

/**
 * Session expiry handler. A 401 on any authenticated call means the token is no
 * longer valid, so we clear it and force the user back to the login page. We skip
 * this while already on /login (a bad-credentials 401 during sign-in must surface
 * its own error, not redirect-loop).
 */
function handleUnauthorized(): void {
  if (typeof window === 'undefined') {
    return
  }
  if (window.location.pathname.startsWith('/login')) {
    return
  }
  clearStoredSession()
  window.location.replace('/login?session=expired')
}

/**
 * Error thrown for any non-2xx response. `payload` holds the parsed JSON body
 * (typically the backend's ErrorResponse), `status` the HTTP status code.
 */
export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, payload: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

/**
 * Orval mutator used by every generated API call. It injects the stored Bearer
 * token (when present) and throws an {@link ApiError} on non-2xx responses, so
 * React Query hooks surface failures via `isError` / rejected `mutateAsync`.
 */
export const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers)

  for (const [key, value] of Object.entries(getAuthorizationHeaders())) {
    if (!headers.has(key)) {
      headers.set(key, value)
    }
  }

  const response = await fetch(url, { ...options, headers })

  const raw = [204, 205, 304].includes(response.status) ? '' : await response.text()
  const data = raw ? JSON.parse(raw) : null

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized()
    }
    throw new ApiError(response.status, data)
  }

  return data as T
}
