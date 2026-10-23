import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import type { Database } from '@cuerda/shared'
import { resolveSupabaseUrl } from './supabaseUrl'

export const supabase = createClient<Database>(
  resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL, Capacitor.getPlatform()),
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
