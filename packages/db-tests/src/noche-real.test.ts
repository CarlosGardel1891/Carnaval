import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { nocheLogica } from '@cuerda/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, withSql } from './clients'
import { ok } from './helpers'
import { repoPath } from './research'

// La noche real del 28/02/2026 (supabase/local/noche_real_2026-02-28.sql) y su cargador,
// `pnpm db:noche-real`. Estos tests la cargan y la quitan: al terminar no queda en la base.

const FUENTE = 'cartelera-2026-02-28'
const LINEAS = 82 // las líneas de «Los tablados del sábado 28»
const LINEAS_MOVILES = 3 // las de «ESCENARIOS MÓVILES», que hoy no tiene alias

const script = (...args: string[]) =>
  spawnSync(process.execPath, [repoPath('scripts', 'db-grilla.mjs'), ...args], { encoding: 'utf8' })
const nocheReal = (...args: string[]) => script('--real', ...args)

const noches = () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{ noche: string; total: number }>(
      `select noche::text, count(*)::int as total
         from public.actuaciones where fuente = $1 group by noche order by noche`,
      [FUENTE],
    )
    return rows.map((r) => [r.noche, r.total])
  })

// Si algún día el seed suma el alias que falta, esas tres líneas también se cargan.
const movilesConAlias = () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{ hay: boolean }>(
      `select exists (
         select 1 from public.escenario_nombres
          where nombre_norm = public.norm('ESCENARIOS MÓVILES')) as hay`,
    )
    return rows[0]!.hay
  })

beforeAll(() => {
  expect(nocheReal('--quitar').status).toBe(0)
})

afterAll(() => {
  nocheReal('--quitar')
})

describe('noche real del 28/02/2026', () => {
  it('el archivo solo, sin pasar por `pnpm db:noche-real`, falla y no carga nada', async () => {
    const sql = readFileSync(repoPath('supabase', 'local', 'noche_real_2026-02-28.sql'), 'utf8')
    await expect(withSql((db) => db.query(sql))).rejects.toThrow(
      /sólo se carga en el Supabase local/,
    )
    expect(await noches()).toEqual([])
  })

  it('carga la cartelera en su fecha y avisa lo que no coincidió con el seed', async () => {
    const conAlias = await movilesConAlias()
    const res = nocheReal()
    expect(res.status).toBe(0)
    expect(await noches()).toEqual([['2026-02-28', conAlias ? LINEAS : LINEAS - LINEAS_MOVILES]])
    expect(res.stdout.includes('ESCENARIOS MÓVILES')).toBe(!conAlias)

    const mezcla = await withSql(async (sql) => {
      const { rows } = await sql.query<{
        ficticios: number
        de_prueba: number
        sin_url: number
        con_ubicacion: number
      }>(
        `select
           count(*) filter (where e.slug like 'ficticio-%')::int as ficticios,
           count(*) filter (where c.slug like 'zz-%')::int as de_prueba,
           count(*) filter (where a.fuente_url not like 'https://www.elobservador.com.uy/%')::int
             as sin_url,
           count(*) filter (where a.ubicacion is not null)::int as con_ubicacion
         from public.actuaciones a
         join public.escenarios e on e.id = a.escenario_id
         join public.conjuntos c on c.id = a.conjunto_id
         where a.fuente = $1`,
        [FUENTE],
      )
      return rows[0]
    })
    // Escenarios y conjuntos del seed, con la nota como fuente y sin coordenadas inventadas.
    expect(mezcla).toEqual({ ficticios: 0, de_prueba: 0, sin_url: 0, con_ubicacion: 0 })
  })

  it('la noche va de las 19:30 a las 00:50 del día siguiente', async () => {
    const filas = ok(await anonClient().rpc('actuaciones_de_la_noche', { p_noche: '2026-02-28' }))
    expect(filas[0]!.inicio).toBe('2026-02-28T22:30:00+00:00') // 19:30 en Montevideo
    expect(filas[0]!.escenario_slug).toBe('velodromo-municipal')
    expect(filas.at(-1)!.inicio).toBe('2026-03-01T03:50:00+00:00') // 00:50 del domingo
    expect(filas.every((f) => f.estado === 'programada')).toBe(true)
  })

  it('el itinerante lleva la dirección de esa noche, sin punto en el mapa', async () => {
    const filas = ok(
      await anonClient().rpc('actuaciones_de_la_noche', { p_noche: '2026-02-28' }),
    ).filter((f) => f.escenario_slug === 'barrio-a-barrio')
    expect(filas.map((f) => f.conjunto_slug)).toEqual([
      'los-rolin',
      'jardin-del-pueblo',
      'geminis',
      'los-muchachos',
    ])
    expect(new Set(filas.map((f) => f.direccion))).toEqual(
      new Set(['UCRANIA Y GRAL. EDUARDO DA COSTA']),
    )
    expect(filas.every((f) => f.itinerante && f.lat === null && f.lng === null)).toBe(true)
  })

  it('volver a cargarla la reemplaza, en la fecha que se pida', async () => {
    expect(nocheReal('2027-02-01').status).toBe(0)
    const cargadas = await noches()
    expect(cargadas.map(([noche]) => noche)).toEqual(['2027-02-01'])
  })

  it('con «hoy» va a la noche lógica de este momento', async () => {
    const hoy = nocheLogica()
    expect(nocheReal('hoy').status).toBe(0)
    const cargadas = await noches()
    expect(cargadas).toHaveLength(1)
    // Por si el test cruza justo las 06:00.
    expect([hoy, nocheLogica()]).toContain(cargadas[0]![0])
  })

  it('no se mezcla con la grilla ficticia: cada una se quita por su lado', async () => {
    expect(script('--quitar').status).toBe(0)
    expect(await noches()).toHaveLength(1)
    expect(nocheReal('--quitar').status).toBe(0)
    expect(await noches()).toEqual([])
  })
})
