import { serve } from '@hono/node-server'
import { env } from './config/env.js'
import { logger } from './core/logger.js'
import app from './index.js'

serve(
  {
    fetch: app.fetch,
    port: env.PORT
  },
  (info) => {
    logger.info(
      {
        address: info.address,
        port: info.port
      },
      'HTTP server listening'
    )
  }
)
