// @vitest-environment node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'

// Lo que se manda a una tienda apunta al proyecto remoto, nunca a un Supabase local
// (decisión 81). Se compila la app de verdad, en cada modo, y se mira lo que sale.

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REMOTE_URL = 'https://remoto-de-prueba.supabase.co'
const LOCAL_URL = 'http://127.0.0.1:55321'
const PUBLIC_KEY = 'clave-publica-de-prueba-4b2d'

const ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_AHORA',
  'VITE_DEMO',
  'VITE_PUSH_ENABLED',
  'VITE_MAPTILER_KEY',
] as const
const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

/** Compila en memoria con ese entorno (que le gana a los `.env` de la carpeta). */
async function bundleFor(mode: string, env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) process.env[key] = env[key] ?? ''
  const result = await build({
    root: appRoot,
    mode,
    logLevel: 'silent',
    build: { write: false },
  })
  let bundle = ''
  for (const output of Array.isArray(result) ? result : [result]) {
    if (!('output' in output)) continue
    for (const file of output.output) {
      bundle += file.type === 'chunk' ? file.code : String(file.source)
    }
  }
  return bundle
}

const remote = { VITE_SUPABASE_URL: REMOTE_URL, VITE_SUPABASE_ANON_KEY: PUBLIC_KEY }
const local = { VITE_SUPABASE_URL: LOCAL_URL, VITE_SUPABASE_ANON_KEY: PUBLIC_KEY }

describe('el build de producción', () => {
  it('apunta al remoto y no a un Supabase local', async () => {
    const bundle = await bundleFor('produccion', remote)
    expect(bundle).toContain(REMOTE_URL)
    expect(bundle).toContain(PUBLIC_KEY)
    expect(bundle).not.toContain(LOCAL_URL)
    expect(bundle).not.toContain('127.0.0.1:55321')
  }, 180_000)

  it('no se compila apuntando a un Supabase local', async () => {
    await expect(bundleFor('produccion', local)).rejects.toThrow(/Supabase local/)
  }, 60_000)

  it('no se compila con el reloj simulado', async () => {
    await expect(
      bundleFor('produccion', { ...remote, VITE_AHORA: '2027-02-05T21:00' }),
    ).rejects.toThrow(/VITE_AHORA/)
  }, 60_000)
})

// El modo demostración (decisión 85) no existe en producción: ni su código ni sus datos. La
// marca sólo está en `app/src/demo/`; el texto de la franja y un dato de la noche de ejemplo
// tampoco pueden aparecer.
const DEMO_TRACES = ['carnavalero-modo-demostracion', 'Versión de prueba']

describe('el modo demostración', () => {
  it('no está en el build de producción', async () => {
    const bundle = await bundleFor('produccion', remote)
    expect(bundle).not.toContain(DEMO_TRACES[0])
    expect(bundle).not.toContain(DEMO_TRACES[1])
    expect(bundle).not.toContain('buildDemoNight')
    expect(bundle).not.toContain('UCRANIA Y GRAL. EDUARDO DA COSTA')
  }, 180_000)

  it('no se compila en producción aunque se lo pida', async () => {
    await expect(bundleFor('produccion', { ...remote, VITE_DEMO: '1' })).rejects.toThrow(
      /VITE_DEMO/,
    )
  }, 60_000)

  it('sí está en el build de la beta', async () => {
    const bundle = await bundleFor('beta', { ...remote, VITE_DEMO: '1' })
    expect(bundle).toContain(DEMO_TRACES[0])
    expect(bundle).toContain(DEMO_TRACES[1])
    expect(bundle).toContain('UCRANIA Y GRAL. EDUARDO DA COSTA')
  }, 180_000)

  it('tampoco está en un build de la beta sin VITE_DEMO', async () => {
    const bundle = await bundleFor('beta', remote)
    expect(bundle).not.toContain(DEMO_TRACES[0])
  }, 180_000)
})

describe('el build de la beta', () => {
  it('tampoco se compila apuntando a un Supabase local', async () => {
    await expect(bundleFor('beta', local)).rejects.toThrow(/Supabase local/)
  }, 60_000)
})

describe('el build de desarrollo', () => {
  it('sí puede apuntar al Supabase local', async () => {
    const bundle = await bundleFor('production', local)
    expect(bundle).toContain(LOCAL_URL)
  }, 180_000)
})
