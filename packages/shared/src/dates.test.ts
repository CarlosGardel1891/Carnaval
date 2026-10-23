import { afterEach, describe, expect, it } from 'vitest'
import { calendarDateInMontevideo, modoLlamadasActivo, nocheLogica } from './dates'

// Montevideo es UTC-3 todo el año (sin horario de verano desde 2015).
const mvd = (local: string) => new Date(`${local}-03:00`)

describe('nocheLogica', () => {
  it('a las 00:40 del sábado es la noche del viernes', () => {
    expect(nocheLogica(mvd('2027-01-23T00:40:00'))).toBe('2027-01-22')
  })

  it('05:59 todavía es la noche anterior', () => {
    expect(nocheLogica(mvd('2027-01-23T05:59:59'))).toBe('2027-01-22')
  })

  it('06:00 ya es el día nuevo', () => {
    expect(nocheLogica(mvd('2027-01-23T06:00:00'))).toBe('2027-01-23')
  })

  it('medianoche exacta es la noche anterior', () => {
    expect(nocheLogica(mvd('2027-01-23T00:00:00'))).toBe('2027-01-22')
  })

  it('23:59 es la misma noche', () => {
    expect(nocheLogica(mvd('2027-01-22T23:59:00'))).toBe('2027-01-22')
  })

  it('cruza el cambio de mes', () => {
    expect(nocheLogica(mvd('2027-02-01T01:30:00'))).toBe('2027-01-31')
    expect(nocheLogica(mvd('2027-03-01T02:00:00'))).toBe('2027-02-28')
  })

  it('cruza el cambio de año', () => {
    expect(nocheLogica(mvd('2027-01-01T03:00:00'))).toBe('2026-12-31')
  })

  it('usa la hora de Montevideo aunque el instante venga en UTC', () => {
    // 03:30 UTC = 00:30 en Montevideo → noche del día anterior.
    expect(nocheLogica(new Date('2027-01-23T03:30:00Z'))).toBe('2027-01-22')
    // 09:00 UTC = 06:00 en Montevideo → día nuevo.
    expect(nocheLogica(new Date('2027-01-23T09:00:00Z'))).toBe('2027-01-23')
  })

  it('rechaza fechas inválidas', () => {
    expect(() => nocheLogica(new Date('no es fecha'))).toThrow(RangeError)
  })
})

describe('independiente de la zona del dispositivo', () => {
  const original = process.env.TZ
  afterEach(() => {
    process.env.TZ = original
  })

  it.each(['Asia/Tokyo', 'Europe/Madrid', 'America/Los_Angeles', 'UTC'])('con TZ=%s', (tz) => {
    process.env.TZ = tz
    expect(nocheLogica(mvd('2027-01-23T00:40:00'))).toBe('2027-01-22')
    expect(nocheLogica(mvd('2027-01-23T06:00:00'))).toBe('2027-01-23')
    expect(calendarDateInMontevideo(mvd('2027-01-23T00:40:00'))).toBe('2027-01-23')
  })
})

describe('calendarDateInMontevideo', () => {
  it('no aplica el corte de las 06:00', () => {
    expect(calendarDateInMontevideo(mvd('2027-01-23T00:40:00'))).toBe('2027-01-23')
  })
})

describe('modoLlamadasActivo', () => {
  const temporada = { modo_llamadas_desde: '2027-02-05', modo_llamadas_hasta: '2027-02-06' }

  it('apagado antes de la primera noche', () => {
    expect(modoLlamadasActivo(mvd('2027-02-04T23:59:00'), temporada)).toBe(false)
    expect(modoLlamadasActivo(mvd('2027-02-05T05:59:00'), temporada)).toBe(false)
  })

  it('activo desde las 06:00 del primer día', () => {
    expect(modoLlamadasActivo(mvd('2027-02-05T06:00:00'), temporada)).toBe(true)
    expect(modoLlamadasActivo(mvd('2027-02-05T21:00:00'), temporada)).toBe(true)
  })

  it('la madrugada después de la última noche sigue activa', () => {
    expect(modoLlamadasActivo(mvd('2027-02-07T01:00:00'), temporada)).toBe(true)
    expect(modoLlamadasActivo(mvd('2027-02-07T05:59:00'), temporada)).toBe(true)
  })

  it('se apaga a las 06:00 del día siguiente a la última noche', () => {
    expect(modoLlamadasActivo(mvd('2027-02-07T06:00:00'), temporada)).toBe(false)
  })

  it('apagado si la temporada no tiene fechas de Llamadas', () => {
    const sinFechas = { modo_llamadas_desde: null, modo_llamadas_hasta: null }
    expect(modoLlamadasActivo(mvd('2027-02-05T21:00:00'), sinFechas)).toBe(false)
  })
})
