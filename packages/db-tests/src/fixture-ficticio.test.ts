import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { nocheLogica } from '@cuerda/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, serviceClient, withSql } from './clients'
import { ok } from './helpers'
import { repoPath } from './research'

// El fixture ficticio del Concurso (supabase/local/fixture_ficticio.sql) y su cargador,
// `pnpm db:fixture`. Estos tests lo cargan y lo quitan: al terminar no queda nada ficticio.

const cargador = (...args: string[]) =>
  spawnSync(process.execPath, [repoPath('scripts', 'db-grilla.mjs'), ...args], { encoding: 'utf8' })
const fixture = (...args: string[]) => cargador('--fixture', ...args)

const resumen = () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{ rueda: string; noches: number; conjuntos: number }>(
      `select e.rueda::text, count(distinct e.id)::int as noches, count(a.id)::int as conjuntos
         from public.etapas_concurso e
         left join public.actuaciones a on a.etapa_id = e.id
        where e.fuente = 'fixture-ficticio'
        group by e.rueda order by e.rueda`,
    )
    return rows.map((r) => [r.rueda, r.noches, r.conjuntos])
  })

const actuacionesFicticias = () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{ total: number }>(
      `select count(*)::int as total from public.actuaciones where fuente = 'fixture-ficticio'`,
    )
    return rows[0]!.total
  })

const enConcurso = () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{ total: number }>(
      `select count(*)::int as total
         from public.conjunto_temporada ct join public.temporadas t on t.id = ct.temporada_id
        where t.anio = 2027 and ct.en_concurso`,
    )
    return rows[0]!.total
  })

beforeAll(() => {
  expect(fixture('--quitar').status).toBe(0)
})

afterAll(() => {
  fixture('--quitar')
  cargador('--quitar')
})

describe('fixture ficticio', () => {
  it('el archivo solo, sin pasar por `pnpm db:fixture`, falla y no carga nada', async () => {
    const sql = readFileSync(repoPath('supabase', 'local', 'fixture_ficticio.sql'), 'utf8')
    await expect(withSql((db) => db.query(sql))).rejects.toThrow(
      /sólo se carga en el Supabase local/,
    )
    expect(await resumen()).toEqual([])
    expect(await actuacionesFicticias()).toBe(0)
  })

  it('carga las tres ruedas: cada conjunto con cupo una vez en la primera y en la segunda', async () => {
    const total = await enConcurso()
    const noches = Math.ceil(total / 4)
    expect(fixture().status).toBe(0)
    expect(await resumen()).toEqual([
      ['primera', noches, total],
      ['segunda', noches, total],
      ['liguilla', 3, 12],
    ])

    const { rows } = await withSql((sql) =>
      sql.query<{ rueda: string; repetidos: number }>(
        `select e.rueda::text, (count(*) - count(distinct a.conjunto_id))::int as repetidos
           from public.etapas_concurso e join public.actuaciones a on a.etapa_id = e.id
          where e.fuente = 'fixture-ficticio' group by e.rueda`,
      ),
    )
    expect(rows.every((r) => r.repetidos === 0)).toBe(true)
  })

  it('todo es en el Teatro de Verano, con conjuntos que están en el Concurso, y marcado', async () => {
    const { rows } = await withSql((sql) =>
      sql.query<{ escenario: string; fuente: string; en_concurso: boolean; misma_noche: boolean }>(
        `select distinct es.slug as escenario, a.fuente, ct.en_concurso, a.noche = e.fecha as misma_noche
           from public.etapas_concurso e
           join public.actuaciones a on a.etapa_id = e.id
           join public.escenarios es on es.id = a.escenario_id
           join public.conjunto_temporada ct
             on ct.conjunto_id = a.conjunto_id and ct.temporada_id = e.temporada_id
          where e.fuente = 'fixture-ficticio'`,
      ),
    )
    // Una sola combinación: la noche lógica de cada actuación es la fecha de su etapa,
    // también la del turno de pasada la medianoche.
    expect(rows).toEqual([
      {
        escenario: 'teatro-de-verano-ramon-collazo',
        fuente: 'fixture-ficticio',
        en_concurso: true,
        misma_noche: true,
      },
    ])
  })

  it('arranca el 2027-01-25, con las ruedas una detrás de otra y un día de descanso entre ellas', async () => {
    const filas = ok(await anonClient().rpc('fixture_del_concurso', { p_anio: 2027 }))
    const noches = [...new Map(filas.map((f) => [f.etapa_id, f])).values()]
    const de = (rueda: string) => noches.filter((n) => n.rueda === rueda).map((n) => n.fecha)
    const primera = de('primera')
    const segunda = de('segunda')
    expect(primera[0]).toBe('2027-01-25')
    const dia = (fecha: string, mas: number) =>
      new Date(Date.parse(`${fecha}T00:00:00Z`) + mas * 86_400_000).toISOString().slice(0, 10)
    expect(segunda[0]).toBe(dia(primera.at(-1)!, 2))
    expect(de('liguilla')).toEqual([1, 2, 3].map((n) => dia(segunda.at(-1)!, n + 1)))
    expect(filas.every((f) => f.fuente === 'fixture-ficticio')).toBe(true)
  })

  it('cada noche tiene sus horas, la última pasada la medianoche', async () => {
    const filas = ok(await anonClient().rpc('fixture_del_concurso', { p_anio: 2027 }))
    const primeraNoche = filas.filter((f) => f.rueda === 'primera' && f.numero === 1)
    expect(primeraNoche.map((f) => new Date(f.inicio).toISOString())).toEqual([
      '2027-01-25T23:30:00.000Z', // 20:30
      '2027-01-26T00:45:00.000Z', // 21:45
      '2027-01-26T02:00:00.000Z', // 23:00
      '2027-01-26T03:15:00.000Z', // 00:15
    ])
  })

  it('volver a cargarlo lo reemplaza: no se duplica', async () => {
    const antes = await resumen()
    expect(fixture().status).toBe(0)
    expect(await resumen()).toEqual(antes)
  })

  it('con «hoy» arranca en la noche lógica de hoy', async () => {
    expect(fixture('hoy').status).toBe(0)
    const { rows } = await withSql((sql) =>
      sql.query<{ fecha: string }>(
        `select min(fecha)::text as fecha from public.etapas_concurso where fuente = 'fixture-ficticio'`,
      ),
    )
    expect(rows[0]!.fecha).toBe(nocheLogica(new Date()))
  })

  it('quitar la grilla ficticia no se lleva el fixture, ni al revés', async () => {
    expect(cargador().status).toBe(0)
    const fixtureAntes = await actuacionesFicticias()
    expect(cargador('--quitar').status).toBe(0)
    expect(await actuacionesFicticias()).toBe(fixtureAntes)

    expect(cargador().status).toBe(0)
    expect(fixture('--quitar').status).toBe(0)
    const { rows } = await withSql((sql) =>
      sql.query<{ total: number }>(
        `select count(*)::int as total from public.actuaciones where fuente = 'ficticia'`,
      ),
    )
    expect(rows[0]!.total).toBeGreaterThan(0)
    expect(cargador('--quitar').status).toBe(0)
  })

  it('`--quitar` no deja etapas ni actuaciones de prueba', async () => {
    expect(fixture().status).toBe(0)
    expect(fixture('--quitar').status).toBe(0)
    expect(await resumen()).toEqual([])
    expect(await actuacionesFicticias()).toBe(0)
    expect(ok(await anonClient().rpc('fixture_del_concurso', { p_anio: 2027 }))).toEqual([])
  })

  it('si la temporada ya tiene un fixture de verdad, no carga el de prueba encima', async () => {
    const temporada = ok(
      await serviceClient().from('temporadas').select('id').eq('anio', 2027).single(),
    ).id
    const real = ok(
      await serviceClient()
        .from('etapas_concurso')
        .insert({
          temporada_id: temporada,
          rueda: 'primera',
          numero: 90,
          fecha: '2027-01-25',
          fuente: 'test',
        })
        .select('id')
        .single(),
    )
    try {
      const resultado = fixture()
      expect(resultado.status).not.toBe(0)
      expect(resultado.stderr).toMatch(/ya tiene 1 etapas que no son de prueba/)
      expect(await resumen()).toEqual([])
    } finally {
      ok(await serviceClient().from('etapas_concurso').delete().eq('id', real.id).select())
    }
  })

  it('rechaza una fecha mal escrita sin tocar la base', async () => {
    const resultado = fixture('25/01/2027')
    expect(resultado.status).not.toBe(0)
    expect(resultado.stderr).toMatch(/no es una fecha/)
    expect(await resumen()).toEqual([])
  })
})
