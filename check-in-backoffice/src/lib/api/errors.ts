import { ApiError } from './fetch-json'

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'message' in error.error &&
    typeof error.error.message === 'string'
  ) {
    return error.error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Request failed'
}
