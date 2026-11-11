import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, serviceClient, withSql } from './clients'
import { ok } from './helpers'
import { repoPath } from './research'

// El orden de desfile de las Llamadas (decisión 64): el ficticio, sólo local
// (supabase/local/orden_ficticio.sql, `pnpm db:llamadas`), y la carga del real desde
// research/llamadas_orden_2027.csv. Al terminar no queda ningún orden en la base.

const NOCHES = ['llamadas-noche-1-2027', 'llamadas-noche-2-2027']

const cargador = (...args: string[]) =>
  spawnSync(process.execPath, [repoPath('scripts', 'db-grilla.mjs'), '--llamadas', ...args], {
    encoding: 'utf8',
  })

const eventoId = async (slug: string) =>
  ok(await anonClient().from('eventos').select('id').eq('slug', slug).single()).id
const orden = async (slug: string) =>
  ok(await anonClient().rpc('orden_del_desfile', { p_evento_id: await eventoId(slug) }))

const clasificadas = () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{ slug: string }>(
      `select c.slug from public.conjunto_temporada ct
         join public.conjuntos c on c.id = ct.conjunto_id
         join public.temporadas t on t.id = ct.temporada_id
        where t.anio = 2027 and ct.en_llamadas order by c.slug`,
    )
    return rows.map((r) => r.slug)
  })

beforeAll(() => {
  expect(cargador('--quitar').status).toBe(0)
})
afterAll(() => {
  cargador('--quitar')
})

describe('orden ficticio', () => {
  it('el archivo solo, sin pasar por `pnpm db:llamadas`, falla y no carga nada', async () => {
    const sql = readFileSync(repoPath('supabase', 'local', 'orden_ficticio.sql'), 'utf8')
    await expect(withSql((db) => db.query(sql))).rejects.toThrow(
      /sólo se carga en el Supabase local/,
    )
    expect(await orden(NOCHES[0]!)).toEqual([])
  })

  it('reparte las comparsas clasificadas en las dos noches, numeradas desde el 1 y sin saltos', async () => {
    const todas = await clasificadas()
    expect(cargador().status).toBe(0)
    const noche1 = await orden(NOCHES[0]!)
    const noche2 = await orden(NOCHES[1]!)
    expect(noche1.length + noche2.length).toBe(todas.length)
    expect(noche1).toHaveLength(Math.ceil(todas.length / 2))
    for (const noche of [noche1, noche2]) {
      expect(noche.map((o) => o.posicion)).toEqual(noche.map((_o, i) => i + 1))
      expect(noche.every((o) => o.fuente === 'orden-ficticio')).toBe(true)
    }
    // Cada comparsa clasificada desfila una vez, en una sola noche.
    expect([...noche1, ...noche2].map((o) => o.conjunto_slug).sort()).toEqual(todas)
  })

  it('volver a cargarlo da el mismo orden: no se duplica', async () => {
    const antes = await orden(NOCHES[0]!)
    expect(cargador().status).toBe(0)
    expect(await orden(NOCHES[0]!)).toEqual(antes)
  })

  it('no lleva fecha: las noches son las de la temporada', () => {
    const resultado = cargador('hoy')
    expect(resultado.status).not.toBe(0)
    expect(resultado.stderr).toMatch(/no lleva fecha/)
  })

  it('`--quitar` no deja nada', async () => {
    expect(cargador('--quitar').status).toBe(0)
    expect(await orden(NOCHES[0]!)).toEqual([])
    expect(await orden(NOCHES[1]!)).toEqual([])
  })

  it('si ya hay un orden de verdad, no carga el de prueba encima', async () => {
    const [slug] = await clasificadas()
    const conjunto = ok(
      await serviceClient().from('conjuntos').select('id').eq('slug', slug!).single(),
    ).id
    const evento = await eventoId(NOCHES[0]!)
    ok(
      await serviceClient()
        .from('orden_desfile')
        .insert({ evento_id: evento, conjunto_id: conjunto, posicion: 1, fuente: 'test' })
        .select(),
    )
    try {
      const resultado = cargador()
      expect(resultado.status).not.toBe(0)
      expect(resultado.stderr).toMatch(/ya tienen 1 lugares de un orden que no es de prueba/)
      expect(await orden(NOCHES[1]!)).toEqual([])
    } finally {
      ok(await serviceClient().from('orden_desfile').delete().eq('evento_id', evento).select())
    }
  })
})

describe('orden real', () => {
  const ENCABEZADO = 'noche,posicion,conjunto,fuente_url'
  let dir: string
  let slugs: string[]

  const archivo = (nombre: string, lineas: string[]) => {
    const ruta = path.join(dir, nombre)
    writeFileSync(ruta, lineas.join('\n') + '\n', 'utf8')
    return ruta
  }
  const python = (...args: string[]) =>
    spawnSync('python', args, {
      cwd: repoPath(),
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
  const validar = (ruta: string) =>
    python(repoPath('research', 'validate.py'), '--quiet', '--orden', ruta)
  const sqlDe = (ruta: string) => {
    const salida = python(repoPath('scripts', 'gen_seed.py'), '--solo-orden', ruta)
    expect(salida.status, salida.stderr).toBe(0)
    return salida.stdout
  }
  const valido = () => [
    ENCABEZADO,
    `1,1,${slugs[0]},https://example.org/orden`,
    `1,2,${slugs[1]},https://example.org/orden`,
    `2,1,${slugs[2]},https://example.org/orden`,
  ]

  /** Corre SQL en una transacción, deja mirar el orden de las dos noches y deshace todo. */
  async function conOrden(sqls: string[]): Promise<[number, string, string][]> {
    return withSql(async (db) => {
      await db.query('begin')
      try {
        for (const sql of sqls) await db.query(sql)
        const { rows } = await db.query<{
          posicion: number
          slug: string
          fuente: string
          noche: string
        }>(
          `select e.slug as noche, o.posicion::int, c.slug, o.fuente
             from public.orden_desfile o
             join public.eventos e on e.id = o.evento_id
             join public.conjuntos c on c.id = o.conjunto_id
            where e.slug = any($1) order by e.slug, o.posicion`,
          [NOCHES],
        )
        return rows.map((r) => [r.posicion, `${r.noche.slice(9, 16)}:${r.slug}`, r.fuente])
      } finally {
        await db.query('rollback')
      }
    })
  }

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'orden-'))
    slugs = (await clasificadas()).slice(0, 4)
  })
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('el archivo del repo, todavía vacío, pasa la validación y no carga nada', () => {
    const salida = python(repoPath('research', 'validate.py'), '--quiet')
    expect(salida.status, salida.stdout).toBe(0)
    expect(salida.stdout).toMatch(/llamadas_orden_2027\.csv: sin filas/)
    const sql = sqlDe(repoPath('research', 'llamadas_orden_2027.csv'))
    expect(sql).toMatch(/todavía no tiene filas/)
    expect(sql).not.toMatch(/insert/i)
  })

  it('un orden bien armado pasa', () => {
    const salida = validar(archivo('valido.csv', valido()))
    expect(salida.status, salida.stdout).toBe(0)
    expect(salida.stdout).toMatch(/llamadas_orden_2027\.csv: 3 lugares/)
  })

  it('rechaza posiciones con saltos, una comparsa repetida, un slug que no existe y una noche 3', () => {
    const salida = validar(
      archivo('malo.csv', [
        ENCABEZADO,
        `1,1,${slugs[0]},https://example.org/orden`,
        `1,3,${slugs[1]},https://example.org/orden`,
        `1,4,${slugs[0]},https://example.org/orden`,
        '2,1,no-existe,https://example.org/orden',
        `3,1,${slugs[2]},https://example.org/orden`,
      ]),
    )
    expect(salida.status).toBe(1)
    expect(salida.stdout).toMatch(/noche 1: las posiciones tienen que ir del 1 al 3/)
    expect(salida.stdout).toMatch(/dos veces en la misma noche/)
    expect(salida.stdout).toMatch(/no es un slug/)
    expect(salida.stdout).toMatch(/noche '3'/)
  })

  it('carga el orden de cada noche, con su fuente', async () => {
    expect(await conOrden([sqlDe(archivo('valido.csv', valido()))])).toEqual([
      [1, `noche-1:${slugs[0]}`, 'research/llamadas_orden_2027.csv'],
      [2, `noche-1:${slugs[1]}`, 'research/llamadas_orden_2027.csv'],
      [1, `noche-2:${slugs[2]}`, 'research/llamadas_orden_2027.csv'],
    ])
  })

  it('si el orden cambia, lo reemplaza entero: no quedan lugares del anterior', async () => {
    const antes = sqlDe(archivo('valido.csv', valido()))
    const despues = sqlDe(
      archivo('cambiado.csv', [
        ENCABEZADO,
        `1,1,${slugs[1]},https://example.org/orden`,
        `1,2,${slugs[3]},https://example.org/orden`,
      ]),
    )
    expect(await conOrden([antes, despues])).toEqual([
      [1, `noche-1:${slugs[1]}`, 'research/llamadas_orden_2027.csv'],
      [2, `noche-1:${slugs[3]}`, 'research/llamadas_orden_2027.csv'],
    ])
  })

  it('una noche con un orden cargado a mano queda como está', async () => {
    const aMano = `insert into public.orden_desfile (evento_id, conjunto_id, posicion, fuente)
      select e.id, c.id, 1, 'im' from public.eventos e, public.conjuntos c
       where e.slug = '${NOCHES[0]}' and c.slug = '${slugs[3]}'`
    expect(await conOrden([aMano, sqlDe(archivo('valido.csv', valido()))])).toEqual([
      [1, `noche-1:${slugs[3]}`, 'im'],
      [1, `noche-2:${slugs[2]}`, 'research/llamadas_orden_2027.csv'],
    ])
  })

  it('con el orden ficticio cargado, se niega a mezclarlos', async () => {
    const ficticio = `insert into public.orden_desfile (evento_id, conjunto_id, posicion, fuente)
      select e.id, c.id, 1, 'orden-ficticio' from public.eventos e, public.conjuntos c
       where e.slug = '${NOCHES[1]}' and c.slug = '${slugs[3]}'`
    await expect(conOrden([ficticio, sqlDe(archivo('valido.csv', valido()))])).rejects.toThrow(
      /Hay un orden ficticio cargado/,
    )
  })
})
