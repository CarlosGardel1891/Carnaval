/**
 * Los modos en que se compila la app para una tienda (decisión 81): `beta` (remoto, con el
 * modo demostración) y `produccion` (remoto, sin él). Lo usa `vite.config.ts` para frenar un
 * build que saldría apuntando a un Supabase local; no tiene nada del navegador.
 */
export const RELEASE_MODES = ['beta', 'produccion'] as const
export type ReleaseMode = (typeof RELEASE_MODES)[number]

/** Las direcciones de un Supabase local: la máquina, y la máquina vista desde el emulador. */
export const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]', '10.0.2.2']

export const isReleaseMode = (mode: string): mode is ReleaseMode =>
  (RELEASE_MODES as readonly string[]).includes(mode)

export interface ReleaseEnv {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  VITE_AHORA?: string
  VITE_DEMO?: string
}

/**
 * Lo que impide publicar un build en ese modo; vacío si está bien. En un modo que no es de
 * tienda no hay nada que controlar.
 */
export function releaseEnvProblems(mode: string, env: ReleaseEnv): string[] {
  if (!isReleaseMode(mode)) return []
  const problems: string[] = []

  const url = env.VITE_SUPABASE_URL?.trim()
  if (!url) {
    problems.push('falta VITE_SUPABASE_URL')
  } else {
    let parsed: URL | null = null
    try {
      parsed = new URL(url)
    } catch {
      problems.push('VITE_SUPABASE_URL no es una dirección')
    }
    if (parsed) {
      if (LOCAL_HOSTS.includes(parsed.hostname)) {
        problems.push('VITE_SUPABASE_URL apunta a un Supabase local')
      } else if (parsed.protocol !== 'https:') {
        problems.push('VITE_SUPABASE_URL tiene que ser https')
      }
    }
  }

  if (!env.VITE_SUPABASE_ANON_KEY?.trim()) problems.push('falta VITE_SUPABASE_ANON_KEY')
  if (env.VITE_AHORA?.trim()) problems.push('VITE_AHORA tiene que estar vacío (reloj simulado)')
  if (mode === 'produccion' && env.VITE_DEMO?.trim()) {
    problems.push('VITE_DEMO tiene que estar vacío: el modo demostración no va a producción')
  }
  return problems
}
