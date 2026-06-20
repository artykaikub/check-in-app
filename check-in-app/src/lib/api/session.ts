const accessTokenKey = 'check-in-app.access-token'
const refreshTokenKey = 'check-in-app.refresh-token'

export type AuthSession = {
  accessToken: string
  refreshToken: string
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const accessToken = window.localStorage.getItem(accessTokenKey)
  const refreshToken = window.localStorage.getItem(refreshTokenKey)

  if (!accessToken || !refreshToken) {
    return null
  }

  return { accessToken, refreshToken }
}

export function setStoredSession(session: AuthSession): void {
  window.localStorage.setItem(accessTokenKey, session.accessToken)
  window.localStorage.setItem(refreshTokenKey, session.refreshToken)
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(accessTokenKey)
  window.localStorage.removeItem(refreshTokenKey)
}

export function getAuthorizationHeaders(): Record<string, string> {
  const session = getStoredSession()
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {}
}
