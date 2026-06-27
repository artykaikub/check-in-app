import { Hono } from 'hono'
import { app } from './app.js'

// `app` is an OpenAPIHono, which extends Hono. The runtime `hono` import and
// instanceof check keep this file the entrypoint that Vercel's Hono framework
// preset detects — it requires a value (non-type) import from `hono`.
if (!(app instanceof Hono)) {
  throw new Error('Backend entrypoint must export a Hono app')
}

export default app
