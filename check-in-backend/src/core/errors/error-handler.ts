import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from './http-error.js'
import type { AppEnv } from '../../types/hono.js'

export const errorHandler: ErrorHandler<AppEnv> = (error, c) => {
  const logger = c.get('logger')

  if (error instanceof AppError) {
    logger.warn(
      { code: error.code, details: error.details, status: error.status },
      error.message
    )

    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      error.status as ContentfulStatusCode
    )
  }

  if (error instanceof HTTPException) {
    logger.warn({ status: error.status }, error.message)

    return c.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: error.message
        }
      },
      error.status
    )
  }

  logger.error({ error }, 'Unhandled application error')

  return c.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      }
    },
    500
  )
}
