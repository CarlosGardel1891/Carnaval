import { createClient } from '@supabase/supabase-js'
import type { Database } from '@cuerda/shared'

// En runtime pueden faltar aunque el tipo diga `string`: Vite deja `undefined` si no hay .env.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copiá admin/.env.example a admin/.env y completalo (ver CLAUDE.md).',
  )
}

/**
 * El panel usa la key pública y la sesión del admin (decisión 69): todo lo que escribe pasa
 * por la RLS. La service role no está acá ni en ningún archivo del panel.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // El login es con email y contraseña: la URL nunca trae una sesión.
    detectSessionInUrl: false,
  },
})
