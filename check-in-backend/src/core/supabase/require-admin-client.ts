import { badRequest } from '../errors/http-error.js'
import { supabaseAdmin } from '../../db/supabase.js'

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw badRequest('SUPABASE_SERVICE_ROLE_KEY is required for this operation')
  }

  return supabaseAdmin
}
