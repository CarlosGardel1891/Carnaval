import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import type { Database } from '@cuerda/shared'
import { resolveSupabaseUrl } from './supabaseUrl'

// En runtime pueden faltar aunque el tipo diga `string`: Vite deja `undefined` si no hay .env.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copiá app/.env.example a app/.env y completalo (ver CLAUDE.md).',
  )
}

export const supabase = createClient<Database>(
  resolveSupabaseUrl(url, Capacitor.getPlatform()),
  anonKey,
)
