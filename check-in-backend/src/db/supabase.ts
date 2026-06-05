import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { env } from '../config/env.js'

type SupabaseOptions = NonNullable<Parameters<typeof createClient>[2]>

const supabaseClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    transport: WebSocket as unknown as NonNullable<
      NonNullable<SupabaseOptions['realtime']>['transport']
    >
  }
} satisfies SupabaseOptions

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  ...supabaseClientOptions
})

export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      ...supabaseClientOptions
    })
  : null
