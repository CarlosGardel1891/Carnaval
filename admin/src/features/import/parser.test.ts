// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CSV_TEMPLATE, CsvHeaderError, parseGridCsv, parseGridText } from './parser'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => readFileSync(path.join(here, 'fixtures', name), 'utf8')
const repoFile = (rel: string) => readFileSync(path.join(here, '../../../..', rel), 'utf8')

const brief = (lines: { escenario: string; hora: string; conjunto: string }[]) =>
  lines.map((l) => `${l.escenario} | ${l.hora} | ${l.conjunto}`)

describe('la cartelera real del sábado 28/02/2026', () => {
  const result = parseGridText(fixture('cartelera-2026-02-28.txt'))

  it('lee las 82 líneas, en orden, de sus 18 escenarios', () => {
    expect(result.format).toBe('cartelera')
    expect(result.lines).toHaveLength(82)
    expect(result.lines.map((l) => l.n)).toEqual(Array.from({ length: 82 }, (_, i) => i + 1))

    const perStage = new Map<string, number>()
    for (const line of result.lines) {
      perStage.set(line.escenario, (perStage.get(line.escenario) ?? 0) + 1)
    }
    expect([...perStage.keys()]).toHaveLength(18)
    expect([...perStage.values()]).toEqual([5, 6, 4, 4, 4, 4, 5, 5, 6, 4, 4, 5, 5, 7, 6, 1, 3, 4])
  })

  it('coincide, línea por línea, con la noche real de prueba', () => {
    // Las mismas 79 líneas que carga `pnpm db:noche-real` (decisión 39), más las 3 de los móviles.
    const sql = repoFile('supabase/local/noche_real_2026-02-28.sql')
    const expected = [...sql.matchAll(/^\s*\('([^']+)', '(\d\d:\d\d)', '([^']+)'\)[,;]\s*$/gm)].map(
      ([, titulo, hora, conjunto]) => ({
        escenario: titulo!.split(' - ENTRADA GRATUITA - ')[0]!,
        hora: hora!,
        conjunto: conjunto!,
      }),
    )
    expect(expected).toHaveLength(79)
    const withoutMobile = result.lines.filter((l) => l.escenario !== 'ESCENARIOS MÓVILES')
    expect(brief(withoutMobile)).toEqual(brief(expected))
  })

  it('un guion en el nombre de un escenario no lo parte', () => {
    const names = new Set(result.lines.map((l) => l.escenario))
    expect(names).toContain('ARBOLITO - EL TEJANO')
    expect(names).toContain('TEATRO MOVIE - MONTEVIDEO SHOPPING CENTER')
  })

  it('saca la parada de los gratuitos itinerantes del título', () => {
    const mobile = result.lines.filter((l) => l.escenario === 'ESCENARIOS MÓVILES')
    expect(mobile.map((l) => [l.hora, l.conjunto, l.direccion])).toEqual([
      ['20:00', 'MI VIEJA MULA', 'PLAZA BOB MARLEY INGAVI Y CANSTATT'],
      ['20:50', 'LOS MUCHACHOS', 'PLAZA BOB MARLEY INGAVI Y CANSTATT'],
      ['21:50', 'YAMBO KENIA', 'PLAZA BOB MARLEY INGAVI Y CANSTATT'],
    ])
    const barrio = result.lines.filter((l) => l.escenario === 'BARRIO A BARRIO')
    expect(barrio).toHaveLength(4)
    expect(barrio[0]!.direccion).toBe('UCRANIA Y GRAL. EDUARDO DA COSTA')
    expect(result.lines.find((l) => l.escenario === 'JULIA ARÉVALO')!.direccion).toBeNull()
  })

  it('deja la madrugada como viene: 00:50', () => {
    const late = result.lines.filter((l) => l.hora === '00:50')
    expect(late).toHaveLength(6)
  })

  it('el título de la nota no se pierde en silencio: queda como no leído', () => {
    expect(result.unread).toEqual([
      { sourceLine: 1, text: 'Los tablados del sábado 28', reason: 'noActs' },
    ])
  })
})

describe('otras formas de escribir una cartelera', () => {
  it('acepta otras formas de la hora y del separador', () => {
    const result = parseGridText(
      [
        'Velódromo Municipal',
        '20.00 hs. Falta y Resto',
        '20:50 – Sociedad Anónima',
        '21h50: Momosapiens',
        '• 22:50 hs - La Margarita',
        '9:30 | La Mojigata',
        '23:50 HOUSE',
      ].join('\r\n'),
    )
    expect(brief(result.lines)).toEqual([
      'Velódromo Municipal | 20:00 | Falta y Resto',
      'Velódromo Municipal | 20:50 | Sociedad Anónima',
      'Velódromo Municipal | 21:50 | Momosapiens',
      'Velódromo Municipal | 22:50 | La Margarita',
      'Velódromo Municipal | 09:30 | La Mojigata',
      'Velódromo Municipal | 23:50 | HOUSE',
    ])
    expect(result.unread).toEqual([])
  })

  it('lista lo que no pudo leer, con su motivo y su línea', () => {
    const result = parseGridText(
      [
        '20:00 - Sin Escenario',
        'Tablado Uno',
        '25:00 - Hora Imposible',
        '21:00 -',
        '21:30 - Bien',
        'Un comentario suelto',
        'Tablado Dos',
      ].join('\n'),
    )
    expect(brief(result.lines)).toEqual(['Tablado Uno | 21:30 | Bien'])
    expect(result.unread).toEqual([
      { sourceLine: 1, text: '20:00 - Sin Escenario', reason: 'noStage' },
      { sourceLine: 3, text: '25:00 - Hora Imposible', reason: 'badTime' },
      { sourceLine: 4, text: '21:00 -', reason: 'noGroup' },
      { sourceLine: 6, text: 'Un comentario suelto', reason: 'noActs' },
      { sourceLine: 7, text: 'Tablado Dos', reason: 'noActs' },
    ])
  })

  it('un texto vacío no da nada', () => {
    expect(parseGridText('  \n\n')).toMatchObject({ lines: [], unread: [] })
  })
})

describe('una tabla copiada, con una fila por actuación', () => {
  it('lee la tabla con las columnas de DAECPU: fecha, hora, conjunto y escenario', () => {
    const result = parseGridText(fixture('tabla-daecpu.txt'))
    expect(result.format).toBe('tabla')
    expect(brief(result.lines)).toEqual([
      'JULIA AREVALO | 20:00 | CABALLEROS',
      'JULIA AREVALO | 20:50 | DOÑA BASTARDA',
      'MONUMENTAL DE LA COSTA | 00:50 | LA TRASNOCHADA',
      'ESCENARIOS MOVILES IM | 21:50 | YAMBO KENIA',
    ])
    expect(result.dates).toEqual(['2026-02-28'])
    expect(result.unread).toEqual([])
  })

  it('sin encabezado reconoce la fecha y la hora por su forma', () => {
    const result = parseGridText(
      [
        '28/02/2026\t20:00\tCaballeros\tJulia Arévalo',
        '21:50 hs\tCyranos\tMuseo del Carnaval',
      ].join('\n'),
    )
    expect(brief(result.lines)).toEqual([
      'Julia Arévalo | 20:00 | Caballeros',
      'Museo del Carnaval | 21:50 | Cyranos',
    ])
    expect(result.dates).toEqual(['2026-02-28'])
  })

  it('respeta el orden de columnas que diga el encabezado', () => {
    const result = parseGridText(
      ['Escenario\tConjunto\tHora', 'Julia Arévalo\tCaballeros\t20:00'].join('\n'),
    )
    expect(brief(result.lines)).toEqual(['Julia Arévalo | 20:00 | Caballeros'])
  })

  it('una fila a la que le falta un dato queda como no leída', () => {
    const result = parseGridText(
      ['Hora\tConjunto\tEscenario', '20:00\tCaballeros\t', '20:50\tCyranos\tMuseo'].join('\n'),
    )
    expect(brief(result.lines)).toEqual(['Museo | 20:50 | Cyranos'])
    expect(result.unread).toEqual([
      { sourceLine: 2, text: '20:00 Caballeros', reason: 'incomplete' },
    ])
  })
})

describe('CSV', () => {
  it('lee la plantilla', () => {
    const result = parseGridCsv(CSV_TEMPLATE)
    expect(result.format).toBe('csv')
    expect(result.lines).toEqual([
      {
        n: 1,
        escenario: 'Velódromo Municipal',
        direccion: null,
        hora: '20:00',
        conjunto: 'Falta y Resto',
        sourceLine: 2,
      },
      {
        n: 2,
        escenario: 'Escenario Móvil IM 1',
        direccion: 'Plaza Bob Marley, Ingavi y Canstatt',
        hora: '20:50',
        conjunto: 'Los Muchachos',
        sourceLine: 3,
      },
    ])
    expect(result.unread).toEqual([])
  })

  it('acepta punto y coma, BOM, comillas dobles y columnas en otro orden', () => {
    const ok = parseGridCsv(
      '\uFEFFhora;conjunto;escenario\r\n20:00;"Los ""Bubys""";"Tablado; Uno"\r\n',
    )
    expect(brief(ok.lines)).toEqual(['Tablado; Uno | 20:00 | Los "Bubys"'])
  })

  it('sin el encabezado de la plantilla no lee nada y lo dice', () => {
    expect(() => parseGridCsv('Velódromo,20:00,Falta y Resto\n')).toThrow(CsvHeaderError)
    expect(() => parseGridCsv('escenario,hora\nVelódromo,20:00\n')).toThrow(CsvHeaderError)
  })

  it('una fila incompleta o con una hora imposible queda como no leída', () => {
    const result = parseGridCsv(
      'escenario,hora,conjunto,direccion\nVelódromo,,Falta y Resto,\nVelódromo,24:10,Cyranos,\n',
    )
    expect(result.lines).toEqual([])
    expect(result.unread.map((u) => [u.sourceLine, u.reason])).toEqual([
      [2, 'incomplete'],
      [3, 'badTime'],
    ])
  })
})
