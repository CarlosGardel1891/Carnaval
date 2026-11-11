import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Las Edge Functions (Deno) no usan una copia de la lógica de fechas y de avisos: importan
// estos mismos archivos por ruta relativa. Deno no resuelve imports sin extensión ni
// paquetes de node_modules, así que lo que importan las funciones —y todo lo que eso
// importe a su vez— tiene que usar sólo rutas relativas con `.ts`.

const here = path.dirname(fileURLToPath(import.meta.url))
const functionsDir = path.resolve(here, '../../../supabase/functions')

const importsOf = (file: string): string[] =>
  [
    ...readFileSync(file, 'utf8').matchAll(
      /(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/g,
    ),
  ].map((match) => match[1]!)

function functionSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return functionSources(full)
    return entry.name.endsWith('.ts') ? [full] : []
  })
}

/** Los archivos de `shared` que cargan las funciones, directa o indirectamente. */
function sharedReachable(): string[] {
  const pending = functionSources(functionsDir).flatMap((file) =>
    importsOf(file)
      .filter((spec) => spec.includes('packages/shared/'))
      .map((spec) => path.resolve(path.dirname(file), spec)),
  )
  const seen = new Set<string>()
  while (pending.length > 0) {
    const file = pending.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    for (const spec of importsOf(file)) {
      if (spec.startsWith('.')) pending.push(path.resolve(path.dirname(file), spec))
    }
  }
  return [...seen].sort()
}

describe('lo que las Edge Functions importan de @cuerda/shared', () => {
  const files = sharedReachable()

  it('usa la lógica de fechas y de avisos de shared, no una copia', () => {
    const names = files.map((file) => path.basename(file))
    expect(names).toEqual(expect.arrayContaining(['dates.ts', 'notices.ts', 'delivery.ts']))
    expect(files.every((file) => file.startsWith(here))).toBe(true)
  })

  it('sólo tiene imports relativos con extensión .ts, que Deno puede resolver', () => {
    const problems = files.flatMap((file) =>
      importsOf(file)
        .filter((spec) => !(spec.startsWith('.') && spec.endsWith('.ts')))
        .map((spec) => `${path.basename(file)}: ${spec}`),
    )
    expect(problems).toEqual([])
  })

  it('las funciones importan de shared con extensión', () => {
    const problems = functionSources(functionsDir).flatMap((file) =>
      importsOf(file)
        .filter((spec) => spec.startsWith('.') && !spec.endsWith('.ts'))
        .map((spec) => `${path.basename(file)}: ${spec}`),
    )
    expect(problems).toEqual([])
  })
})
