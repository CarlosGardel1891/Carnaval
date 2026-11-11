import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withSql } from './clients'
import { repoPath } from './research'

// La carga del fixture real del Concurso (decisión 57): research/fixture_2027.csv, validado
// por research/validate.py y convertido a SQL por scripts/gen_seed.py. Hoy el archivo está
// vacío (el fixture no se publicó), así que acá se prueba el camino con un archivo de
// ejemplo: el SQL corre dentro de una transacción que se deshace, y en la base no queda nada.

const ENCABEZADO = 'rueda,numero,fecha,hora,conjunto,fuente_url'
const VALIDO = [
  ENCABEZADO,
  'primera,1,2027-01-25,20:30,dona-bastarda,https://example.org/fixture',
  // Pasada la medianoche: sigue siendo la noche del 25.
  'primera,1,2027-01-25,00:15,la-gran-muneca,https://example.org/fixture',
  'primera,2,2027-01-26,21:00,la-nueva-milonga,',
  'segunda,1,2027-02-10,20:30,dona-bastarda,',
]

let dir: string
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
  python(repoPath('research', 'validate.py'), '--quiet', '--fixture', ruta)
const sqlDe = (ruta: string) => {
  const salida = python(repoPath('scripts', 'gen_seed.py'), '--solo-fixture', ruta)
  expect(salida.status, salida.stderr).toBe(0)
  return salida.stdout
}

interface Fila {
  rueda: string
  numero: number
  fecha: string
  slug: string
  inicio: string
  misma_noche: boolean
  fuente: string
  fuente_etapa: string
}

/** Corre el SQL del fixture en una transacción, deja mirar la base y deshace todo. */
async function conFixture<T>(
  sqls: string[],
  mirar: (leer: () => Promise<Fila[]>, cola: () => Promise<number>) => Promise<T>,
): Promise<T> {
  return withSql(async (db) => {
    await db.query('begin')
    try {
      for (const sql of sqls) await db.query(sql)
      const leer = async () =>
        (
          await db.query<Fila>(
            `select e.rueda::text, e.numero::int, e.fecha::text, c.slug,
                    to_char(a.inicio at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI') as inicio,
                    a.noche = e.fecha as misma_noche, a.fuente, e.fuente as fuente_etapa
               from public.etapas_concurso e
               join public.actuaciones a on a.etapa_id = e.id
               join public.conjuntos c on c.id = a.conjunto_id
              where e.fuente = 'research/fixture_2027.csv'
              order by e.rueda, e.numero, a.inicio`,
          )
        ).rows
      const cola = async () =>
        (
          await db.query<{ total: number }>(
            `select count(*)::int as total from public.cambios_actuacion c
               join public.actuaciones a on a.id = c.actuacion_id
              where a.fuente = 'research/fixture_2027.csv'`,
          )
        ).rows[0]!.total
      return await mirar(leer, cola)
    } finally {
      await db.query('rollback')
    }
  })
}

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'fixture-'))
  // El fixture real no se mezcla con el de prueba: si quedó cargado en la base local, se quita
  // (como el test de la grilla ficticia, deja la base sin datos de prueba).
  const quitar = spawnSync(
    process.execPath,
    [repoPath('scripts', 'db-grilla.mjs'), '--fixture', '--quitar'],
    { encoding: 'utf8' },
  )
  expect(quitar.status, quitar.stderr).toBe(0)
})
afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('validación del fixture real', () => {
  it('el archivo del repo, todavía vacío, pasa la validación', () => {
    const salida = python(repoPath('research', 'validate.py'), '--quiet')
    expect(salida.status, salida.stdout).toBe(0)
    expect(salida.stdout).toMatch(/fixture_2027\.csv: sin filas/)
  })

  it('un fixture bien armado pasa', () => {
    const salida = validar(archivo('valido.csv', VALIDO))
    expect(salida.status, salida.stdout).toBe(0)
    expect(salida.stdout).toMatch(/fixture_2027\.csv: 4 actuaciones/)
  })

  it.each([
    [
      'un conjunto que no está en conjuntos.csv',
      'primera,1,2027-01-25,20:30,no-existe,',
      /no es un slug/,
    ],
    ['una hora que no existe', 'primera,1,2027-01-25,25:00,dona-bastarda,', /hora no es HH:MM/],
    [
      'una fecha que no existe',
      'primera,1,2027-02-30,20:30,dona-bastarda,',
      /no es una fecha válida/,
    ],
    ['una rueda desconocida', 'tercera,1,2027-01-25,20:30,dona-bastarda,', /rueda 'tercera'/],
    [
      'un número de etapa que no es un entero',
      'primera,uno,2027-01-25,20:30,dona-bastarda,',
      /numero/,
    ],
    [
      'una fuente que no es una dirección web',
      'primera,1,2027-01-25,20:30,dona-bastarda,diario',
      /fuente_url/,
    ],
  ])('rechaza %s', (_caso, linea, mensaje) => {
    const salida = validar(archivo('malo.csv', [ENCABEZADO, linea]))
    expect(salida.status).toBe(1)
    expect(salida.stdout).toMatch(mensaje)
  })

  it('rechaza una etapa con dos fechas, dos etapas la misma noche y un conjunto repetido', () => {
    const salida = validar(
      archivo('cruzado.csv', [
        ENCABEZADO,
        'primera,1,2027-01-25,20:30,dona-bastarda,',
        'primera,1,2027-01-26,21:30,la-gran-muneca,',
        'primera,2,2027-01-25,20:30,la-nueva-milonga,',
        'primera,1,2027-01-25,22:30,dona-bastarda,',
      ]),
    )
    expect(salida.status).toBe(1)
    expect(salida.stdout).toMatch(/la etapa primera 1 tiene dos fechas/)
    expect(salida.stdout).toMatch(/ya es de la etapa primera 1/)
    expect(salida.stdout).toMatch(/dos veces en la misma etapa/)
  })

  it('rechaza un archivo con otras columnas', () => {
    const salida = validar(
      archivo('columnas.csv', ['rueda,numero,fecha,conjunto', 'primera,1,2027-01-25,x']),
    )
    expect(salida.status).toBe(1)
    expect(salida.stdout).toMatch(/columnas/)
  })
})

describe('carga del fixture real', () => {
  it('sin filas, el SQL no carga nada', () => {
    const sql = sqlDe(archivo('vacio.csv', [ENCABEZADO]))
    expect(sql).toMatch(/todavía no tiene filas/)
    expect(sql).not.toMatch(/insert/i)
  })

  it('carga las etapas y las actuaciones en el Teatro de Verano, con la hora de Montevideo', async () => {
    const sql = sqlDe(archivo('valido.csv', VALIDO))
    const filas = await conFixture([sql], (leer) => leer())
    expect(filas.map((f) => [f.rueda, f.numero, f.fecha, f.slug, f.inicio])).toEqual([
      ['primera', 1, '2027-01-25', 'dona-bastarda', '2027-01-25T23:30'], // 20:30
      ['primera', 1, '2027-01-25', 'la-gran-muneca', '2027-01-26T03:15'], // 00:15 del 26
      ['primera', 2, '2027-01-26', 'la-nueva-milonga', '2027-01-27T00:00'], // 21:00
      ['segunda', 1, '2027-02-10', 'dona-bastarda', '2027-02-10T23:30'],
    ])
    // La noche lógica de cada actuación es la fecha de su etapa, y todo queda con su fuente.
    expect(filas.every((f) => f.misma_noche)).toBe(true)
    expect(new Set(filas.map((f) => `${f.fuente}|${f.fuente_etapa}`))).toEqual(
      new Set(['research/fixture_2027.csv|research/fixture_2027.csv']),
    )
  })

  it('volver a cargarlo no duplica nada ni encola avisos de cambio', async () => {
    const sql = sqlDe(archivo('valido.csv', VALIDO))
    const [filas, encolados] = await conFixture([sql, sql, sql], async (leer, cola) => [
      await leer(),
      await cola(),
    ])
    expect(filas).toHaveLength(4)
    expect(encolados).toBe(0)
  })

  it('si cambia la hora de un conjunto, actualiza esa actuación y encola el cambio', async () => {
    const antes = sqlDe(archivo('valido.csv', VALIDO))
    const cambiado = VALIDO.map((linea) =>
      linea.startsWith('primera,2') ? 'primera,2,2027-01-26,22:10,la-nueva-milonga,' : linea,
    )
    const despues = sqlDe(archivo('cambiado.csv', cambiado))
    const [filas, encolados] = await conFixture([antes, despues], async (leer, cola) => [
      await leer(),
      await cola(),
    ])
    expect(filas).toHaveLength(4)
    expect(filas.find((f) => f.slug === 'la-nueva-milonga')?.inicio).toBe('2027-01-27T01:10')
    expect(encolados).toBe(1)
  })

  it('con el fixture ficticio cargado, se niega a mezclarlos', async () => {
    const sql = sqlDe(archivo('valido.csv', VALIDO))
    await expect(
      conFixture(
        [
          `insert into public.etapas_concurso (temporada_id, rueda, numero, fecha, fuente)
           select id, 'liguilla', 90, '2027-03-01', 'fixture-ficticio' from public.temporadas where anio = 2027`,
          sql,
        ],
        (leer) => leer(),
      ),
    ).rejects.toThrow(/Hay un fixture ficticio cargado/)
  })
})
