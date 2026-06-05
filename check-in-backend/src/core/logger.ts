import pino from 'pino'
import { env } from '../config/env.js'

const loggerOptions = {
  name: env.APP_NAME,
  level: env.LOG_LEVEL
}

export const logger = pino(
  env.NODE_ENV === 'development'
    ? {
        ...loggerOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard'
          }
        }
      }
    : loggerOptions
)

export type AppLogger = typeof logger
