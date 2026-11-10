import { readFileSync } from 'node:fs'
import { norm } from '@cuerda/shared'
import { describe, expect, it } from 'vitest'
import { anonClient, withSql } from './clients'

interface Caso {
  grupo: 'real' | 'sintetico'
  s: string
  /** Resultado de la `norm` de Python (research/validate.py). */
  py: string
}

// Generado por scripts/gen_norm_cases.py a partir de los CSV de research/.
const casos = JSON.parse(
  readFileSync(new URL('../fixtures/norm_cases.json', import.meta.url), 'utf8'),
) as Caso[]
const reales = casos.filter((c) => c.grupo === 'real')
const sinteticos = casos.filter((c) => c.grupo === 'sintetico')

/** `public.norm` de cada texto, en una sola consulta y en el mismo orden. */
async function normSql(textos: string[]): Promise<string[]> {
  const { rows } = await withSql((sql) =>
    sql.query<{ n: string }>(
      `select public.norm(t.s) as n
         from jsonb_array_elements_text($1::jsonb) with ordinality as t(s, i)
        order by t.i`,
      [JSON.stringify(textos)],
    ),
  )
  return rows.map((r) => r.n)
}

const diferencias = (textos: string[], obtenido: string[]) =>
  textos
    .map((s, i) => ({ s, sql: obtenido[i], ts: norm(s) }))
    .filter((c) => c.sql !== c.ts)
    .map((c) => JSON.stringify(c))

describe('public.norm es igual a norm() de TypeScript', () => {
  it('el fixture tiene los casos reales de research/ y los 62 sintéticos', () => {
    expect(reales.length).toBeGreaterThanOrEqual(300)
    expect(sinteticos).toHaveLength(62)
  })

  it(`en los ${reales.length} casos reales`, async () => {
    const textos = reales.map((c) => c.s)
    expect(diferencias(textos, await normSql(textos))).toEqual([])
  })

  it(`en los ${sinteticos.length} casos sintéticos`, async () => {
    const textos = sinteticos.map((c) => c.s)
    expect(diferencias(textos, await normSql(textos))).toEqual([])
  })

  it('carácter por carácter, en los bloques con los que se escriben nombres', async () => {
    // Latino, griego y cirílico; latino y griego extendidos; puntuación y espacios;
    // formas de presentación latinas y de ancho completo. Sin U+0000, que Postgres no admite.
    const bloques: [number, number][] = [
      [0x0001, 0x052f],
      [0x1e00, 0x1fff],
      [0x2000, 0x206f],
      [0x2100, 0x214f],
      [0xfb00, 0xfb06],
      [0xff00, 0xffef],
    ]
    const textos: string[] = []
    for (const [desde, hasta] of bloques) {
      for (let c = desde; c <= hasta; c++) textos.push(`a${String.fromCodePoint(c)}b`)
    }
    expect(diferencias(textos, await normSql(textos))).toEqual([])
  })

  it('es idempotente en los casos reales', async () => {
    // No lo es en general, ni en SQL ni en TypeScript: las minúsculas van antes de NFKD, y hay
    // caracteres de compatibilidad que se descomponen en mayúsculas («№» pasa a «No»).
    const una = await normSql(reales.map((c) => c.s))
    expect(await normSql(una)).toEqual(una)
  })

  it('devuelve null con null y vacío con sólo espacios', async () => {
    const { rows } = await withSql((sql) =>
      sql.query<{ nulo: string | null; vacio: string }>(
        `select public.norm(null) as nulo, public.norm(E' \\t\\n ') as vacio`,
      ),
    )
    expect(rows).toEqual([{ nulo: null, vacio: '' }])
  })

  it('se puede llamar por la API sin sesión', async () => {
    const { data, error } = await anonClient().rpc('norm', { t: '  Samburú   MORÁN ' })
    expect(error).toBeNull()
    expect(data).toBe('samburu moran')
  })
})

describe('norm de Python (research/validate.py) frente a la de TypeScript', () => {
  it('coinciden en todos los casos reales', () => {
    expect(reales.filter((c) => c.py !== norm(c.s)).map((c) => c.s)).toEqual([])
  })

  it('difieren sólo en los casos borde conocidos (decisión 22)', () => {
    const difieren = [...new Set(sinteticos.filter((c) => c.py !== norm(c.s)).map((c) => c.s))]
    expect(difieren).toEqual([
      'ΌΣΟΣ', // sigma final: casefold la pasa a σ, toLowerCase la deja ς
      'x﻿y', // U+FEFF: espacio para \s de JavaScript, no para Python
      // Marcas con clase de combinación 0 (Mc, Me y algunas Mn): \p{M} las saca,
      // unicodedata.combining() no.
      'aःb',
      'a⃝b',
      'a\u001c\u001db', // U+001C a U+001F: espacio para Python, no para JavaScript
      'a\u0085b', // U+0085: ídem
      'a\u0085b\u001cc',
      'हिन्दी', // otra vez marcas con clase de combinación 0
      'ไทย์',
    ])
  })
})
