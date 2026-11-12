// Todo lo que habla con Supabase desde el panel. Los tests de pantallas lo reemplazan con
// `vi.mock('…/lib/api')`, que toma el doble de `__mocks__/api.ts`: al agregar una función
// acá hay que sumarla ahí.
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface AdminSession {
  email: string
  /** Si la sesión trae el claim `app_metadata.rol = 'admin'` (decisión 23). */
  isAdmin: boolean
}

/** El email o la contraseña no coinciden con ninguna cuenta. */
export class WrongCredentialsError extends Error {}

const toAdminSession = (session: Session | null): AdminSession | null =>
  session && {
    email: session.user.email ?? '',
    isAdmin: session.user.app_metadata.rol === 'admin',
  }

export async function getSession(): Promise<AdminSession | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return toAdminSession(data.session)
}

/** Avisa cada vez que la sesión cambia (entra, sale o vence). Devuelve cómo dejar de escuchar. */
export function onSessionChange(listener: (session: AdminSession | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(toAdminSession(session))
  })
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.code === 'invalid_credentials') throw new WrongCredentialsError(error.message)
    throw error
  }
  const session = toAdminSession(data.session)
  if (!session) throw new Error('Supabase no devolvió una sesión.')
  return session
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
