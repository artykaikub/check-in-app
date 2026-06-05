import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

process.env.NODE_ENV ??= 'test'
process.env.SUPABASE_URL ??= 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY ??= 'local-codegen-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'local-codegen-service-role-key'

const outputPath = resolve('src/generated/openapi.json')
const { default: app } = await import('../../check-in-backend/dist/index.js')
const response = await app.request('/openapi.json')

if (!response.ok) {
  throw new Error(`Unable to export OpenAPI document: ${response.status}`)
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(await response.json(), null, 2)}\n`)
