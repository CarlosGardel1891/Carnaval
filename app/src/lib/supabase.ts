import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import type { Database } from '@cuerda/shared'
import { preferencesStorage } from './preferencesStorage'
import { resolveSupabaseUrl } from './supabaseUrl'

// En runtime pueden faltar aunque el tipo diga `string`: Vite deja `undefined` si no hay .env.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copiá app/.env.example a app/.env y completalo (ver CLAUDE.md).',
  )
}

/**
 * La app lee todo con la key pública. La sesión (anónima) recién existe después del primer
 * «Seguir» (decisión 44) y se guarda con `@capacitor/preferences`, no en el `localStorage`
 * del WebView: con la sesión se perderían los conjuntos seguidos y el registro de push.
 */
export const supabase = createClient<Database>(
  resolveSupabaseUrl(url, Capacitor.getPlatform()),
  anonKey,
  {
    auth: {
      storage: preferencesStorage,
      persistSession: true,
      autoRefreshToken: true,
      // No hay inicio de sesión por enlace: la URL de la app nunca trae una sesión.
      detectSessionInUrl: false,
    },
  },
)
