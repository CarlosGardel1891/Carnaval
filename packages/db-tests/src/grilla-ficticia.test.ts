import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { nocheLogica } from '@cuerda/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, withSql } from './clients'
import { ok } from './helpers'
import { repoPath } from './research'

// La grilla ficticia (supabase/local/grilla_ficticia.sql) y su cargador, `pnpm db:grilla`.
// Estos tests la cargan y la quitan: al terminar no queda nada ficticio en la base.

const grilla = (...args: string[]) =>
  spawnSync(process.execPath, [repoPath('scripts', 'db-grilla.mjs'), ...args], { encoding: 'utf8' })

const noches = () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{ noche: string; total: number }>(
      `select noche::text, count(*)::int as total
         from public.actuaciones where fuente = 'ficticia' group by noche order by noche`,
    )
    return rows.map((r) => [r.noche, r.total])
  })

const escenariosFicticios = () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{ total: number }>(
      `select count(*)::int as total from public.escenarios where slug like 'ficticio-%'`,
    )
    return rows[0]!.total
  })

beforeAll(() => {
  expect(grilla('--quitar').status).toBe(0)
})

afterAll(() => {
  grilla('--quitar')
})

describe('grilla ficticia', () => {
  it('el archivo solo, sin pasar por `pnpm db:grilla`, falla y no carga nada', async () => {
    const sql = readFileSync(repoPath('supabase', 'local', 'grilla_ficticia.sql'), 'utf8')
    await expect(withSql((db) => db.query(sql))).rejects.toThrow(
      /sólo se carga en el Supabase local/,
    )
    expect(await noches()).toEqual([])
    expect(await escenariosFicticios()).toBe(0)
  })

  it('no está entre los seeds ni en las migraciones', () => {
    const config = readFileSync(repoPath('supabase', 'config.toml'), 'utf8')
    const paths = /^sql_paths\s*=\s*(.*)$/m.exec(config)?.[1] ?? ''
    expect(paths).toContain('./seeds/')
    expect(paths).not.toMatch(/local|ficticia|\*/)
  })

  it('carga tres noches desde el 2027-01-28, con conjuntos del seed en escenarios ficticios', async () => {
    expect(grilla().status).toBe(0)
    expect(await noches()).toEqual([
      ['2027-01-28', 17],
      ['2027-01-29', 17],
      ['2027-01-30', 17],
    ])
    expect(await escenariosFicticios()).toBe(4)

    const mezcla = await withSql(async (sql) => {
      const { rows } = await sql.query<{ fuera_de_lugar: number; conjuntos_de_prueba: number }>(
        `select
           count(*) filter (where (a.fuente = 'ficticia') <> (e.slug like 'ficticio-%'))::int
             as fuera_de_lugar,
           count(*) filter (where a.fuente = 'ficticia' and c.slug like 'zz-%')::int
             as conjuntos_de_prueba
         from public.actuaciones a
         join public.escenarios e on e.id = a.escenario_id
         join public.conjuntos c on c.id = a.conjunto_id`,
      )
      return rows[0]
    })
    expect(mezcla).toEqual({ fuera_de_lugar: 0, conjuntos_de_prueba: 0 })
  })

  it('la noche sale ordenada por hora, con lo de después de la medianoche al final', async () => {
    const filas = ok(
      await anonClient().rpc('actuaciones_de_la_noche', { p_noche: '2027-01-28' }),
    ).filter((f) => f.escenario_slug.startsWith('ficticio-'))
    expect(filas).toHaveLength(17)
    const horas = filas.map((f) => new Date(f.inicio).getTime())
    expect(horas).toEqual([...horas].sort((a, b) => a - b))
    expect(filas[0]!.inicio).toBe('2027-01-28T23:30:00+00:00') // 20:30 en Montevideo
    expect(filas.at(-1)!.inicio).toBe('2027-01-29T03:40:00+00:00') // 00:40 del día siguiente
    expect(new Set(filas.map((f) => f.conjunto_id)).size).toBe(17)
    expect(
      filas
        .map((f) => f.estado)
        .filter((e) => e !== 'programada')
        .sort(),
    ).toEqual(['cambiada', 'suspendida'])
    const movil = filas.filter((f) => f.escenario_slug === 'ficticio-movil')
    expect(movil.map((f) => f.direccion)).toEqual(['Esquina ficticia 1', 'Esquina ficticia 2'])
    expect(movil.every((f) => f.lat !== null && f.lng !== null && f.itinerante)).toBe(true)
  })

  it('el mapa encuentra el tablado fijo y, por sus paradas de esa noche, el móvil', async () => {
    const filas = ok(
      await anonClient().rpc('escenarios_cercanos', {
        p_lat: -34.905,
        p_lng: -56.19,
        p_radio_m: 3000,
        p_noche: '2027-01-28',
      }),
    ).filter((f) => f.slug.startsWith('ficticio-'))
    expect(filas.map((f) => f.slug)).toEqual(['ficticio-centro', 'ficticio-movil'])
  })

  it('volver a cargarla la reemplaza, desde la fecha que se pida', async () => {
    expect(grilla('2027-02-01').status).toBe(0)
    expect(await noches()).toEqual([
      ['2027-02-01', 17],
      ['2027-02-02', 17],
      ['2027-02-03', 17],
    ])
    expect(await escenariosFicticios()).toBe(4)
  })

  it('con «hoy» arranca en la noche lógica de este momento', async () => {
    const hoy = nocheLogica()
    expect(grilla('hoy').status).toBe(0)
    const cargadas = await noches()
    expect(cargadas).toHaveLength(3)
    // Por si el test cruza justo las 06:00.
    expect([hoy, nocheLogica()]).toContain(cargadas[0]![0])
  })

  it('rechaza una fecha mal escrita sin tocar la base', async () => {
    const antes = await noches()
    const res = grilla('28/01/2027')
    expect(res.status).toBe(1)
    expect(res.stderr).toContain('no es una fecha')
    expect(await noches()).toEqual(antes)
  })

  it('--quitar la borra entera', async () => {
    expect(grilla('--quitar').status).toBe(0)
    expect(await noches()).toEqual([])
    expect(await escenariosFicticios()).toBe(0)
  })
})
