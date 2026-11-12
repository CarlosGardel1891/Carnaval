// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { beforeAll, describe, expect, it } from 'vitest'

// La service role nunca llega al navegador (decisión 69). Se compila el panel con una
// service role de mentira en el entorno y se revisa que no haya quedado en lo que se publica.

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_KEY = 'clave-publica-de-prueba-7f3a'
const SERVICE_KEY = 'service-role-de-prueba-9c1e'

let bundle = ''

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:55321'
  process.env.VITE_SUPABASE_ANON_KEY = PUBLIC_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY
  process.env.SERVICE_ROLE_KEY = SERVICE_KEY
  const result = await build({
    root: adminRoot,
    logLevel: 'silent',
    build: { write: false },
  })
  const outputs = Array.isArray(result) ? result : [result]
  for (const output of outputs) {
    if (!('output' in output)) continue
    for (const file of output.output) {
      bundle += file.type === 'chunk' ? file.code : String(file.source)
    }
  }
}, 120_000)

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx|json|html|css)$/.test(entry.name) ? [full] : []
  })

describe('lo que se publica del panel', () => {
  it('lleva la key pública: el entorno sí entra en el build', () => {
    expect(bundle).toContain(PUBLIC_KEY)
  })

  it('no lleva la service role', () => {
    expect(bundle).not.toContain(SERVICE_KEY)
  })

  it('no lleva ningún token con rol service_role', () => {
    // Un JWT de Supabase: tres partes en base64url. Se decodifica la del medio.
    const tokens = bundle.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) ?? []
    for (const token of tokens) {
      const payload = Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8')
      expect(payload).not.toContain('service_role')
    }
  })

  it('el código del panel no nombra la service role key', () => {
    const offenders = [
      ...sourceFiles(path.join(adminRoot, 'src')),
      path.join(adminRoot, 'index.html'),
    ]
      .filter((file) => !file.endsWith('build.test.ts'))
      .filter((file) =>
        /SERVICE_ROLE_KEY|serviceRoleKey|service_role_key/.test(readFileSync(file, 'utf8')),
      )
      .map((file) => path.relative(adminRoot, file))
    expect(offenders).toEqual([])
  })

  it('sólo usa variables de entorno pensadas para el navegador (VITE_…)', () => {
    const offenders = sourceFiles(path.join(adminRoot, 'src'))
      .filter((file) => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))
      .filter((file) =>
        /process\.env|import\.meta\.env\.(?!VITE_|DEV\b|PROD\b|MODE\b)/.test(
          readFileSync(file, 'utf8'),
        ),
      )
      .map((file) => path.relative(adminRoot, file))
    expect(offenders).toEqual([])
  })
})
