import { supabaseAdmin } from '../../db/supabase.js'

export function requireSupabaseAdmin() {
  return supabaseAdmin
}
