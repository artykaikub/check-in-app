import type { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { env } from './env.js'
import type { AppEnv } from '../types/hono.js'

export function registerOpenApi(app: OpenAPIHono<AppEnv>): void {
  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: `${env.APP_NAME} API`,
      version: env.APP_VERSION,
      description: 'Check-in backend API for shared auth, frontend, and backoffice clients.'
    },
    servers: [
      {
        url: '/',
        description: 'Current deployment'
      }
    ],
    tags: [
      { name: 'Health', description: 'Service health and diagnostics' },
      { name: 'Auth', description: 'Shared authentication routes' },
      { name: 'Frontend', description: 'Frontend application routes' },
      { name: 'Backoffice', description: 'Backoffice administration routes' }
    ]
  })

  app.get('/docs', swaggerUI({ url: '/openapi.json' }))
}
