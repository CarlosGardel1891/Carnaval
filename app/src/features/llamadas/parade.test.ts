import { afterEach, describe, expect, it } from 'vitest'
import { nocheLogica } from '@cuerda/shared'
import { NIGHT_1, NIGHT_2, nights, order1, order2, route } from './llamadas-fixtures'
import { blocksOf, departures, nearestBlock, passTimes, pickNight } from './parade'

const iso = (instant: Date) => instant.toISOString().slice(0, 16)

const systemTz = process.env.TZ
afterEach(() => {
  if (systemTz === undefined) delete process.env.TZ
  else process.env.TZ = systemTz
})

describe('pickNight', () => {
  it('antes del desfile muestra la primera noche', () => {
    expect(pickNight(nights(), '2027-01-30')?.slug).toBe('llamadas-noche-1-2027')
  })

  it('la noche del desfile muestra la de hoy', () => {
    expect(pickNight(nights(), '2027-02-05')?.slug).toBe('llamadas-noche-1-2027')
    expect(pickNight(nights(), '2027-02-06')?.slug).toBe('llamadas-noche-2-2027')
  })

  it('cuando ya pasaron las dos, queda la última', () => {
    expect(pickNight(nights(), '2027-02-20')?.slug).toBe('llamadas-noche-2-2027')
  })

  it('no depende del orden en que llegan, y sin noches no hay ninguna', () => {
    expect(pickNight([NIGHT_2, NIGHT_1], '2027-01-30')?.slug).toBe('llamadas-noche-1-2027')
    expect(pickNight([], '2027-02-05')).toBeNull()
  })
})

describe('departures', () => {
  it('la primera sale a las 20:00 de Montevideo y cada una, 10 minutos después', () => {
    expect(departures(NIGHT_1, order1()).map((s) => [s.conjunto_nombre, iso(s.time)])).toEqual([
      ['C 1080', '2027-02-05T23:00'], // 20:00
      ['Valores de Ansina', '2027-02-05T23:10'],
      ['La Dominguera', '2027-02-05T23:20'],
    ])
  })

  it('una del medio y la última de 26, que sale pasada la medianoche y sigue siendo esa noche', () => {
    const slots = departures(NIGHT_2, order2())
    expect(iso(slots[11]!.time)).toBe('2027-02-07T00:50') // la 12: 21:50
    const last = slots.at(-1)!
    expect(iso(last.time)).toBe('2027-02-07T03:10') // la 26: 00:10 del domingo
    expect(nocheLogica(last.time)).toBe('2027-02-06')
  })

  it('usa el horario y el atraso del evento', () => {
    const atrasada = { ...NIGHT_1, desfile_inicio: '20:30:00', desfile_atraso_min: 20 }
    expect(iso(departures(atrasada, order1())[0]!.time)).toBe('2027-02-05T23:50')
  })

  it.each(['Asia/Tokyo', 'America/Los_Angeles'])('no depende del reloj del sistema (%s)', (tz) => {
    process.env.TZ = tz
    expect(iso(departures(NIGHT_1, order1())[2]!.time)).toBe('2027-02-05T23:20')
  })

  it('sin orden no hay horas', () => {
    expect(departures(NIGHT_1, [])).toEqual([])
  })
})

describe('blocksOf', () => {
  it('dos esquinas seguidas son una cuadra, con sus calles y la mitad del camino', () => {
    const blocks = blocksOf(route())
    expect(blocks.map((b) => [b.number, b.street, b.from, b.to, b.middleM])).toEqual([
      [1, 'Carlos Gardel', 'Zelmar Michelini', 'Carlos Quijano', 75],
      [2, 'Isla de Flores', 'Carlos Quijano', 'Aquiles Lanza', 225],
      [3, 'Isla de Flores', 'Aquiles Lanza', 'Ejido', 375],
    ])
  })

  it('ordena las esquinas aunque lleguen desordenadas', () => {
    expect(blocksOf([...route()].reverse()).map((b) => b.from)).toEqual([
      'Zelmar Michelini',
      'Carlos Quijano',
      'Aquiles Lanza',
    ])
  })

  it('sin recorrido, o con una sola esquina, no hay cuadras', () => {
    expect(blocksOf([])).toEqual([])
    expect(blocksOf(route().slice(0, 1))).toEqual([])
  })
})

describe('nearestBlock', () => {
  const blocks = blocksOf(route())
  const corners = route()

  it('parado en una cuadra, es esa', () => {
    const middle = { lat: -34.911, lng: (corners[1]!.lng + corners[2]!.lng) / 2 }
    const found = nearestBlock(blocks, middle)!
    expect(found.block.number).toBe(2)
    expect(found.distanceM).toBeLessThan(1)
  })

  it('a una cuadra de distancia hacia el sur, es la que queda enfrente', () => {
    // Unos 100 metros al sur de la mitad de la tercera cuadra.
    const south = { lat: -34.9119, lng: (corners[2]!.lng + corners[3]!.lng) / 2 }
    const found = nearestBlock(blocks, south)!
    expect(found.block.number).toBe(3)
    expect(found.distanceM).toBeGreaterThan(95)
    expect(found.distanceM).toBeLessThan(105)
  })

  it('más allá de la llegada, es la última; antes de la salida, la primera', () => {
    expect(nearestBlock(blocks, { lat: -34.911, lng: -56.18 })!.block.number).toBe(3)
    expect(nearestBlock(blocks, { lat: -34.911, lng: -56.2 })!.block.number).toBe(1)
  })

  it('sin cuadras no hay ninguna cerca', () => {
    expect(nearestBlock([], { lat: -34.911, lng: -56.19 })).toBeNull()
  })
})

describe('passTimes', () => {
  const blocks = blocksOf(route())

  it('la primera comparsa pasa por la mitad de la primera cuadra a los 5 minutos', () => {
    // 75 metros a 15 metros por minuto.
    expect(iso(passTimes(NIGHT_1, order1(), blocks[0]!)[0]!.time)).toBe('2027-02-05T23:05')
  })

  it('por una misma cuadra, cada comparsa pasa 10 minutos después de la anterior', () => {
    // La mitad de la tercera cuadra está a 375 metros: 25 minutos de marcha.
    expect(passTimes(NIGHT_1, order1(), blocks[2]!).map((s) => iso(s.time))).toEqual([
      '2027-02-05T23:25',
      '2027-02-05T23:35',
      '2027-02-05T23:45',
    ])
  })

  it('una que pasa después de medianoche sigue siendo de esa noche', () => {
    const late = passTimes(NIGHT_2, order2(), blocks[2]!).at(-1)!
    expect(iso(late.time)).toBe('2027-02-07T03:35') // 00:35
    expect(nocheLogica(late.time)).toBe('2027-02-06')
  })
})
