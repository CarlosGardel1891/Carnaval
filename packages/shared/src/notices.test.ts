import { afterEach, describe, expect, it } from 'vitest'
import {
  buildChangeNotices,
  buildDailyNotices,
  isDailyNoticeWindow,
  type ChangeRow,
  type DailyRow,
} from './notices'
import { noticeTexts } from './noticeTexts'

const NOCHE = '2027-01-28'
const mvd = (local: string) => `${local}-03:00`

let nextId = 1

function daily(overrides: Partial<DailyRow> = {}): DailyRow {
  const id = nextId++
  return {
    aviso_id: 500,
    token: 'tok-a',
    idioma: 'es',
    conjunto_id: 1,
    conjunto_slug: 'la-gran-muneca',
    conjunto_nombre: 'La Gran Muñeca',
    actuacion_id: id,
    noche: NOCHE,
    inicio: mvd('2027-01-28T22:50:00'),
    escenario_nombre: 'Tablado del Centro',
    ...overrides,
  }
}

/** Una comparsa en el orden de desfile de esa noche: sin actuación ni hora. */
function parade(position: number, overrides: Partial<DailyRow> = {}): DailyRow {
  return daily({
    conjunto_id: 40,
    conjunto_slug: 'c-1080',
    conjunto_nombre: 'C 1080',
    noche: '2027-02-05',
    actuacion_id: null,
    inicio: null,
    escenario_nombre: 'Desfile Oficial de Llamadas - noche 1',
    desfile_posicion: position,
    desfile_inicio: null,
    desfile_intervalo_min: null,
    desfile_separacion_m: null,
    desfile_atraso_min: 0,
    ...overrides,
  })
}

function change(overrides: Partial<ChangeRow> = {}): ChangeRow {
  return {
    ...(daily() as ChangeRow),
    estado: 'cambiada',
    estado_anterior: 'programada',
    inicio_anterior: mvd('2027-01-28T22:50:00'),
    ...overrides,
  }
}

const systemTz = process.env.TZ
afterEach(() => {
  if (systemTz === undefined) delete process.env.TZ
  else process.env.TZ = systemTz
})

describe('textos de los avisos', () => {
  it('es y en tienen las mismas claves y ningún texto vacío', () => {
    expect(Object.keys(noticeTexts.en).sort()).toEqual(Object.keys(noticeTexts.es).sort())
    for (const texts of Object.values(noticeTexts)) {
      expect(Object.values(texts).every((text) => text.trim() !== '' || text === ' · ')).toBe(true)
    }
  })

  it('los dos idiomas usan las mismas variables en cada texto', () => {
    const variables = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
    for (const key of Object.keys(noticeTexts.es) as (keyof typeof noticeTexts.es)[]) {
      expect([key, variables(noticeTexts.en[key])]).toEqual([key, variables(noticeTexts.es[key])])
    }
  })
})

describe('aviso del día', () => {
  it('un conjunto en un escenario: hora y lugar, y abre su ficha', () => {
    expect(buildDailyNotices([daily()])).toEqual([
      {
        token: 'tok-a',
        language: 'es',
        title: 'Hoy actúa La Gran Muñeca',
        body: 'A las 22:50 en Tablado del Centro.',
        route: '/conjuntos/la-gran-muneca',
        noticeIds: [500],
      },
    ])
  })

  it('en inglés según el idioma del dispositivo', () => {
    const [notice] = buildDailyNotices([daily({ idioma: 'en' })])
    expect(notice).toMatchObject({
      language: 'en',
      title: 'La Gran Muñeca performs tonight',
      body: 'At 10:50 PM at Tablado del Centro.',
    })
  })

  it('un conjunto en dos escenarios la misma noche: un solo aviso con las dos horas', () => {
    const notices = buildDailyNotices([
      // Llegan en desorden: la de pasada la medianoche va después.
      daily({ inicio: mvd('2027-01-29T00:30:00'), escenario_nombre: 'Tablado del Prado' }),
      daily({ inicio: mvd('2027-01-28T21:00:00') }),
    ])
    expect(notices).toHaveLength(1)
    expect(notices[0]).toMatchObject({
      title: 'Hoy actúa La Gran Muñeca',
      body: '21:00 en Tablado del Centro · 00:30 en Tablado del Prado',
      route: '/conjuntos/la-gran-muneca',
      noticeIds: [500],
    })
  })

  it('varios conjuntos: un resumen por dispositivo, que abre «mis conjuntos» de esa noche', () => {
    const notices = buildDailyNotices([
      daily({ inicio: mvd('2027-01-28T21:00:00') }),
      daily({
        aviso_id: 501,
        conjunto_id: 2,
        conjunto_slug: 'c-1080',
        conjunto_nombre: 'C 1080',
        inicio: mvd('2027-01-28T20:30:00'),
        escenario_nombre: 'Escenario Prado',
      }),
      daily({ inicio: mvd('2027-01-28T23:45:00'), escenario_nombre: 'Tablado del Prado' }),
    ])
    expect(notices).toEqual([
      {
        token: 'tok-a',
        language: 'es',
        title: 'Hoy actúan 2 de tus conjuntos',
        body: [
          'C 1080: 20:30 en Escenario Prado',
          'La Gran Muñeca: 21:00 en Tablado del Centro · 23:45 en Tablado del Prado',
        ].join('\n'),
        route: '/?noche=2027-01-28&mios=1',
        noticeIds: [500, 501],
      },
    ])
  })

  it('con muchos conjuntos corta en «y N más»', () => {
    const rows = Array.from({ length: 6 }, (_unused, i) =>
      daily({
        aviso_id: 600 + i,
        conjunto_id: 10 + i,
        conjunto_slug: `conjunto-${i}`,
        conjunto_nombre: `Conjunto ${i}`,
        inicio: mvd(`2027-01-28T2${i % 4}:00:00`),
      }),
    )
    const [es] = buildDailyNotices(rows)
    expect(es!.title).toBe('Hoy actúan 6 de tus conjuntos')
    expect(es!.body.split('\n')).toHaveLength(4)
    expect(es!.body.split('\n').at(-1)).toBe('y 3 más')
    expect(es!.noticeIds).toHaveLength(6)

    const [en] = buildDailyNotices(rows.map((row) => ({ ...row, idioma: 'en' as const })))
    expect(en!.title).toBe('6 of your groups perform tonight')
    expect(en!.body.split('\n').at(-1)).toBe('and 3 more')
  })

  it('cada dispositivo recibe sólo lo suyo, en su idioma', () => {
    const notices = buildDailyNotices([
      daily(),
      daily({
        aviso_id: 700,
        token: 'tok-b',
        idioma: 'en',
        conjunto_id: 2,
        conjunto_slug: 'c-1080',
        conjunto_nombre: 'C 1080',
      }),
      // El mismo usuario con dos teléfonos: los dos reciben el aviso, y es un solo aviso.
      daily({ token: 'tok-a2' }),
    ])
    expect(notices.map((n) => [n.token, n.title, n.noticeIds])).toEqual([
      ['tok-a', 'Hoy actúa La Gran Muñeca', [500]],
      ['tok-b', 'C 1080 performs tonight', [700]],
      ['tok-a2', 'Hoy actúa La Gran Muñeca', [500]],
    ])
  })

  it('sin filas no hay avisos', () => {
    expect(buildDailyNotices([])).toEqual([])
  })

  it.each(['Asia/Tokyo', 'America/Los_Angeles', 'UTC'])(
    'las horas son las de Montevideo con el reloj del sistema en %s',
    (tz) => {
      process.env.TZ = tz
      const rows = [daily({ inicio: '2027-01-29T03:40:00Z' })] // 00:40 en Montevideo
      expect(buildDailyNotices(rows)[0]!.body).toBe('A las 00:40 en Tablado del Centro.')
      expect(buildDailyNotices(rows.map((r) => ({ ...r, idioma: 'en' as const })))[0]!.body).toBe(
        'At 12:40 AM at Tablado del Centro.',
      )
    },
  )
})

describe('aviso del día con el Desfile de Llamadas', () => {
  it('una comparsa que desfila: la hora estimada de salida, dicha como estimada, y abre Llamadas', () => {
    process.env.TZ = 'Asia/Tokyo'
    // La quinta sale 40 minutos después de la primera.
    expect(buildDailyNotices([parade(5)])).toEqual([
      {
        token: 'tok-a',
        language: 'es',
        title: 'Hoy desfila C 1080 en las Llamadas',
        body: 'Sale a eso de las 20:40 (hora estimada).',
        route: '/llamadas?noche=2027-02-05',
        noticeIds: [500],
      },
    ])
  })

  it('en inglés', () => {
    const [notice] = buildDailyNotices([parade(1, { idioma: 'en' })])
    expect(notice).toMatchObject({
      title: 'C 1080 parades in the Llamadas tonight',
      body: 'Sets off around 8:00 PM (estimated).',
    })
  })

  it('la que sale pasada la medianoche sigue siendo de esa noche', () => {
    const [notice] = buildDailyNotices([parade(26)])
    expect(notice!.body).toBe('Sale a eso de las 00:10 (hora estimada).')
    expect(notice!.route).toBe('/llamadas?noche=2027-02-05')
  })

  it('usa el horario del evento y su atraso, si los trae', () => {
    const [notice] = buildDailyNotices([
      parade(3, {
        desfile_inicio: '20:30:00',
        desfile_intervalo_min: 12,
        desfile_separacion_m: 150,
        desfile_atraso_min: 20,
      }),
    ])
    // 20:30 + 20 de atraso + 2 × 12.
    expect(notice!.body).toBe('Sale a eso de las 21:14 (hora estimada).')
  })

  it('varias comparsas que desfilan: un resumen por orden de salida, que abre Llamadas', () => {
    const [notice] = buildDailyNotices([
      parade(12, { aviso_id: 501, conjunto_id: 41, conjunto_nombre: 'Valores de Ansina' }),
      parade(2, { aviso_id: 502 }),
    ])
    expect(notice).toEqual({
      token: 'tok-a',
      language: 'es',
      title: 'Hoy desfilan 2 de tus comparsas',
      body: 'C 1080: ≈ 20:10 en las Llamadas\nValores de Ansina: ≈ 21:50 en las Llamadas',
      route: '/llamadas?noche=2027-02-05',
      noticeIds: [501, 502],
    })
  })

  it('una noche con tablado y desfile: un resumen con las dos cosas, que abre «mis conjuntos»', () => {
    const [notice] = buildDailyNotices([
      daily({
        aviso_id: 503,
        noche: '2027-02-05',
        inicio: mvd('2027-02-05T21:30:00'),
      }),
      parade(2, { aviso_id: 502 }),
    ])
    expect(notice).toMatchObject({
      title: 'Hoy actúan 2 de tus conjuntos',
      body: 'C 1080: ≈ 20:10 en las Llamadas\nLa Gran Muñeca: 21:30 en Tablado del Centro',
      route: '/?noche=2027-02-05&mios=1',
    })
  })

  it('una comparsa que esa noche actúa en un tablado y además desfila: un aviso con las dos horas', () => {
    const [notice] = buildDailyNotices([
      parade(4),
      daily({
        conjunto_id: 40,
        conjunto_slug: 'c-1080',
        conjunto_nombre: 'C 1080',
        noche: '2027-02-05',
        inicio: mvd('2027-02-05T23:15:00'),
      }),
    ])
    expect(notice).toMatchObject({
      title: 'Hoy actúa C 1080',
      body: '≈ 20:30 en las Llamadas · 23:15 en Tablado del Centro',
      route: '/conjuntos/c-1080',
    })
  })
})

describe('avisos de cambio y suspensión', () => {
  it('una suspensión de esta noche', () => {
    const rows = [change({ estado: 'suspendida' })]
    expect(buildChangeNotices(rows, NOCHE)).toEqual([
      {
        token: 'tok-a',
        language: 'es',
        title: 'La Gran Muñeca: actuación suspendida',
        body: 'Era hoy a las 22:50 en Tablado del Centro.',
        route: '/conjuntos/la-gran-muneca',
        noticeIds: [500],
      },
    ])
    const [en] = buildChangeNotices(
      rows.map((r) => ({ ...r, idioma: 'en' as const })),
      NOCHE,
    )
    expect(en).toMatchObject({
      title: 'La Gran Muñeca: show cancelled',
      body: 'It was tonight at 10:50 PM at Tablado del Centro.',
    })
  })

  it('un cambio de hora dice la nueva y la de antes', () => {
    const rows = [change({ inicio: mvd('2027-01-28T23:10:00') })]
    expect(buildChangeNotices(rows, NOCHE)[0]).toMatchObject({
      title: 'La Gran Muñeca: cambió la actuación',
      body: 'Ahora es hoy a las 23:10 en Tablado del Centro (antes, a las 22:50).',
    })
    expect(
      buildChangeNotices(
        rows.map((r) => ({ ...r, idioma: 'en' as const })),
        NOCHE,
      )[0],
    ).toMatchObject({
      title: 'La Gran Muñeca: show changed',
      body: "It's now tonight at 11:10 PM at Tablado del Centro (it was at 10:50 PM).",
    })
  })

  it('un cambio de lugar, sin cambio de hora, no menciona la hora de antes', () => {
    const [notice] = buildChangeNotices([change({ escenario_nombre: 'Tablado del Prado' })], NOCHE)
    expect(notice!.body).toBe('Ahora es hoy a las 22:50 en Tablado del Prado.')
  })

  it('una suspendida que vuelve a estar programada', () => {
    const rows = [change({ estado: 'programada', estado_anterior: 'suspendida' })]
    expect(buildChangeNotices(rows, NOCHE)[0]).toMatchObject({
      title: 'La Gran Muñeca: vuelve a actuar',
      body: 'Actúa hoy a las 22:50 en Tablado del Centro.',
    })
    expect(
      buildChangeNotices(
        rows.map((r) => ({ ...r, idioma: 'en' as const })),
        NOCHE,
      )[0],
    ).toMatchObject({
      title: 'La Gran Muñeca: back on',
      body: 'Performing tonight at 10:50 PM at Tablado del Centro.',
    })
  })

  it('si es de otra noche, dice el día', () => {
    const rows = [
      change({
        estado: 'suspendida',
        noche: '2027-01-30',
        inicio: mvd('2027-01-31T00:40:00'), // pasada la medianoche: sigue siendo la noche del 30
      }),
    ]
    expect(buildChangeNotices(rows, NOCHE)[0]!.body).toBe(
      'Era el sábado 30 de enero a las 00:40 en Tablado del Centro.',
    )
    expect(
      buildChangeNotices(
        rows.map((r) => ({ ...r, idioma: 'en' as const })),
        NOCHE,
      )[0]!.body,
    ).toBe('It was on Saturday, January 30 at 12:40 AM at Tablado del Centro.')
  })

  it('varios cambios para un dispositivo son un único aviso', () => {
    const notices = buildChangeNotices(
      [
        change({ aviso_id: 1, inicio: mvd('2027-01-28T23:10:00') }),
        change({
          aviso_id: 2,
          conjunto_id: 2,
          conjunto_slug: 'c-1080',
          conjunto_nombre: 'C 1080',
          estado: 'suspendida',
          inicio: mvd('2027-01-28T20:30:00'),
          inicio_anterior: mvd('2027-01-28T20:30:00'),
          escenario_nombre: 'Escenario Prado',
        }),
      ],
      NOCHE,
    )
    expect(notices).toEqual([
      {
        token: 'tok-a',
        language: 'es',
        title: 'Cambios en tus conjuntos',
        body: [
          'C 1080: suspendida (hoy, 20:30 en Escenario Prado)',
          'La Gran Muñeca: ahora hoy, 23:10 en Tablado del Centro',
        ].join('\n'),
        route: '/?noche=2027-01-28&mios=1',
        noticeIds: [1, 2],
      },
    ])
  })

  it('una noche entera suspendida: un aviso por dispositivo, no uno por actuación', () => {
    const rows = Array.from({ length: 8 }, (_unused, i) =>
      change({
        aviso_id: 100 + i,
        token: i % 2 === 0 ? 'tok-a' : 'tok-b',
        idioma: i % 2 === 0 ? 'es' : 'en',
        conjunto_id: 20 + i,
        conjunto_slug: `conjunto-${i}`,
        conjunto_nombre: `Conjunto ${i}`,
        estado: 'suspendida',
      }),
    )
    const notices = buildChangeNotices(rows, NOCHE)
    expect(notices.map((n) => [n.token, n.title, n.noticeIds.length])).toEqual([
      ['tok-a', 'Cambios en tus conjuntos', 4],
      ['tok-b', 'Changes to your groups', 4],
    ])
    expect(notices[1]!.body.split('\n')[0]).toBe(
      'Conjunto 1: cancelled (tonight, 10:50 PM at Tablado del Centro)',
    )
  })

  it('dos cambios del mismo conjunto abren su ficha', () => {
    const [notice] = buildChangeNotices(
      [
        change({ aviso_id: 1, inicio: mvd('2027-01-28T21:30:00') }),
        change({ aviso_id: 2, estado: 'suspendida', escenario_nombre: 'Tablado del Prado' }),
      ],
      NOCHE,
    )
    expect(notice!.route).toBe('/conjuntos/la-gran-muneca')
    expect(notice!.title).toBe('Cambios en tus conjuntos')
  })

  it.each(['Asia/Tokyo', 'America/Los_Angeles'])(
    'la hora y el día son los de Montevideo con el reloj del sistema en %s',
    (tz) => {
      process.env.TZ = tz
      const rows = [
        change({
          noche: '2027-01-30',
          inicio: '2027-01-31T02:10:00Z', // sábado 30, 23:10 en Montevideo
          inicio_anterior: '2027-01-31T01:30:00Z',
        }),
      ]
      expect(buildChangeNotices(rows, NOCHE)[0]!.body).toBe(
        'Ahora es el sábado 30 de enero a las 23:10 en Tablado del Centro (antes, a las 22:30).',
      )
    },
  )
})

describe('horario del aviso del día', () => {
  const at = (time: string) => new Date(`2027-01-28T${time}:00-03:00`)

  it('va de las 12:00 a las 19:00 de Montevideo', () => {
    expect(isDailyNoticeWindow(at('11:59'))).toBe(false)
    expect(isDailyNoticeWindow(at('12:00'))).toBe(true)
    expect(isDailyNoticeWindow(at('18:30'))).toBe(true)
    // La pasada de las 19:00 entra aunque arranque unos minutos tarde.
    expect(isDailyNoticeWindow(at('19:05'))).toBe(true)
    expect(isDailyNoticeWindow(at('19:30'))).toBe(false)
    expect(isDailyNoticeWindow(at('00:30'))).toBe(false)
  })

  it.each(['Asia/Tokyo', 'America/Los_Angeles', 'UTC'])(
    'no depende del reloj del sistema (%s)',
    (tz) => {
      process.env.TZ = tz
      // 15:00 UTC son las 12:00 de Montevideo; 14:59 UTC, las 11:59.
      expect(isDailyNoticeWindow(new Date('2027-01-28T15:00:00Z'))).toBe(true)
      expect(isDailyNoticeWindow(new Date('2027-01-28T14:59:00Z'))).toBe(false)
    },
  )
})
