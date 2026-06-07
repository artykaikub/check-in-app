import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

process.env.NODE_ENV ??= 'test'
process.env.SUPABASE_URL ??= 'https://example.supabase.co'
process.env.SUPABASE_PUBLISHABLE_KEY ??= 'sb_publishable_local-codegen-key'
process.env.SUPABASE_SECRET_KEY ??= 'sb_secret_local-codegen-key'

const outputPath = resolve('src/generated/openapi.json')
const { default: app } = await import('../../check-in-backend/dist/index.js')
const response = await app.request('/openapi.json')

if (!response.ok) {
  throw new Error(`Unable to export OpenAPI document: ${response.status}`)
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(await response.json(), null, 2)}\n`)
