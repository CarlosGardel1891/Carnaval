import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface LocalEnv {
  apiUrl: string
  anonKey: string
  serviceRoleKey: string
  dbUrl: string
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]'])

function isLoopback(url: string): boolean {
  try {
    return LOOPBACK.has(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * Lee la URL y las keys del Supabase local con `supabase status`, en el momento:
 * así ninguna key queda escrita en el repo ni hace falta un `.env` para los tests.
 */
export function readLocalEnv(): LocalEnv {
  // El binario del CLI está en el node_modules de la raíz; se agrega al PATH para que
  // ande igual en Windows (supabase.cmd) y en Linux, se llame como se llame la variable.
  const pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === 'path') ?? 'PATH'
  const binDir = path.join(repoRoot, 'node_modules', '.bin')
  let out: string
  try {
    out = execSync('supabase status -o env', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, [pathKey]: binDir + path.delimiter + (process.env[pathKey] ?? '') },
    })
  } catch (cause) {
    throw new Error(
      'No se pudo leer el estado del Supabase local. ¿Está levantado? Corré `pnpm supabase start`.',
      { cause },
    )
  }

  const vars = new Map<string, string>()
  for (const line of out.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim())
    if (m?.[1] && m[2] !== undefined) vars.set(m[1], m[2])
  }
  const need = (key: string): string => {
    const value = vars.get(key)
    if (!value) throw new Error(`\`supabase status\` no devolvió ${key}.`)
    return value
  }

  const env: LocalEnv = {
    apiUrl: need('API_URL'),
    anonKey: need('ANON_KEY'),
    serviceRoleKey: need('SERVICE_ROLE_KEY'),
    dbUrl: need('DB_URL'),
  }
  // Estos tests crean y borran usuarios y filas: nunca contra un proyecto remoto.
  if (!isLoopback(env.apiUrl) || !isLoopback(env.dbUrl)) {
    throw new Error('Los tests de base sólo corren contra el Supabase local (127.0.0.1).')
  }
  return env
}
