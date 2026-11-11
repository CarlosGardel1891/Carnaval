import { afterEach, describe, expect, it } from 'vitest'
import { instantInMontevideo, nocheLogica } from './dates'
import {
  departureTime,
  marchSpeed,
  PARADE_DEFAULTS,
  paradeRules,
  paradeStart,
  passTime,
} from './llamadas'

const NOCHE = '2027-02-05'
const RULES = paradeRules()
// Montevideo es UTC-3 todo el año: las 20:00 son las 23:00 UTC.
const iso = (instant: Date) => instant.toISOString().slice(0, 19)

const systemTz = process.env.TZ
afterEach(() => {
  if (systemTz === undefined) delete process.env.TZ
  else process.env.TZ = systemTz
})

describe('instantInMontevideo', () => {
  it('convierte una fecha y una hora de Montevideo en el instante que corresponde', () => {
    expect(iso(instantInMontevideo('2027-02-05', '20:00'))).toBe('2027-02-05T23:00:00')
    expect(iso(instantInMontevideo('2027-02-05', '00:40'))).toBe('2027-02-05T03:40:00')
    expect(iso(instantInMontevideo('2027-02-05', '21:30:15'))).toBe('2027-02-06T00:30:15')
  })

  it.each(['Asia/Tokyo', 'America/Los_Angeles', 'UTC'])(
    'no depende del reloj del sistema (%s)',
    (tz) => {
      process.env.TZ = tz
      expect(iso(instantInMontevideo('2027-02-05', '20:00'))).toBe('2027-02-05T23:00:00')
    },
  )

  it('respeta el horario de verano que Uruguay tuvo hasta 2015 (no hay un offset fijo)', () => {
    // En enero de 2010 Montevideo estaba en UTC-2.
    expect(iso(instantInMontevideo('2010-01-15', '20:00'))).toBe('2010-01-15T22:00:00')
  })

  it('rechaza lo que no es una fecha o una hora', () => {
    expect(() => instantInMontevideo('05/02/2027', '20:00')).toThrow(RangeError)
    expect(() => instantInMontevideo('2027-02-05', '8 de la noche')).toThrow(RangeError)
    expect(() => instantInMontevideo('2027-02-05', '25:00')).toThrow(RangeError)
  })
})

describe('reglas del desfile', () => {
  it('sin datos del evento valen las de la decisión 7', () => {
    expect(RULES).toEqual({ start: '20:00', intervalMin: 10, gapM: 150, delayMin: 0 })
    expect(PARADE_DEFAULTS).toEqual({ start: '20:00', intervalMin: 10, gapM: 150 })
  })

  it('lo que el evento dice manda; lo que calla, queda por defecto', () => {
    expect(
      paradeRules({
        desfile_inicio: '20:30:00',
        desfile_intervalo_min: 8,
        desfile_separacion_m: null,
        desfile_atraso_min: 25,
      }),
    ).toEqual({ start: '20:30:00', intervalMin: 8, gapM: 150, delayMin: 25 })
  })

  it('marchan a 15 metros por minuto: 150 metros cada 10 minutos', () => {
    expect(marchSpeed(RULES)).toBe(15)
    expect(marchSpeed(paradeRules({ desfile_intervalo_min: 5, desfile_separacion_m: 100 }))).toBe(
      20,
    )
  })
})

describe('hora estimada de salida', () => {
  it('la primera comparsa sale a las 20:00 de Montevideo', () => {
    expect(iso(paradeStart(NOCHE, RULES))).toBe('2027-02-05T23:00:00')
    expect(iso(departureTime(NOCHE, 1, RULES))).toBe('2027-02-05T23:00:00')
  })

  it('una del medio sale 10 minutos después por cada comparsa que tiene adelante', () => {
    // La 12 tiene once adelante: 20:00 + 110 minutos = 21:50.
    expect(iso(departureTime(NOCHE, 12, RULES))).toBe('2027-02-06T00:50:00')
    expect(iso(departureTime(NOCHE, 2, RULES))).toBe('2027-02-05T23:10:00')
  })

  it('la última de 23 sale a las 23:40', () => {
    expect(iso(departureTime(NOCHE, 23, RULES))).toBe('2027-02-06T02:40:00')
  })

  it('una que sale después de medianoche sigue siendo de esa noche', () => {
    // La 26 saldría a las 00:10 del día siguiente.
    const salida = departureTime(NOCHE, 26, RULES)
    expect(iso(salida)).toBe('2027-02-06T03:10:00')
    expect(nocheLogica(salida)).toBe(NOCHE)
  })

  it('el atraso corre todas las salidas', () => {
    const atrasado = paradeRules({ desfile_atraso_min: 35 })
    expect(iso(departureTime(NOCHE, 1, atrasado))).toBe('2027-02-05T23:35:00')
    expect(iso(departureTime(NOCHE, 12, atrasado))).toBe('2027-02-06T01:25:00')
  })

  it('usa la hora y el intervalo del evento, si los trae', () => {
    const reglas = paradeRules({ desfile_inicio: '20:30', desfile_intervalo_min: 8 })
    expect(iso(departureTime(NOCHE, 1, reglas))).toBe('2027-02-05T23:30:00')
    expect(iso(departureTime(NOCHE, 4, reglas))).toBe('2027-02-05T23:54:00')
  })

  it('una salida programada pasada la medianoche es de la madrugada siguiente', () => {
    const reglas = paradeRules({ desfile_inicio: '00:30' })
    const salida = departureTime(NOCHE, 1, reglas)
    expect(iso(salida)).toBe('2027-02-06T03:30:00')
    expect(nocheLogica(salida)).toBe(NOCHE)
  })

  it('la posición empieza en 1 y es un número entero', () => {
    for (const mala of [0, -1, 1.5, Number.NaN]) {
      expect(() => departureTime(NOCHE, mala, RULES)).toThrow(RangeError)
    }
  })

  it.each(['Asia/Tokyo', 'America/Los_Angeles', 'UTC'])(
    'no depende del reloj del sistema (%s)',
    (tz) => {
      process.env.TZ = tz
      expect(iso(departureTime(NOCHE, 12, RULES))).toBe('2027-02-06T00:50:00')
    },
  )
})

describe('hora estimada de paso', () => {
  it('en la salida, pasa cuando sale', () => {
    expect(passTime(NOCHE, 12, 0, RULES)).toEqual(departureTime(NOCHE, 12, RULES))
  })

  it('la primera llega a 150 metros en 10 minutos, cuando sale la segunda', () => {
    expect(iso(passTime(NOCHE, 1, 150, RULES))).toBe('2027-02-05T23:10:00')
    expect(passTime(NOCHE, 1, 150, RULES)).toEqual(departureTime(NOCHE, 2, RULES))
  })

  it('una del medio, a mitad del recorrido', () => {
    // La 12 sale 21:50 y tarda 30 minutos en hacer 450 metros: 22:20.
    expect(iso(passTime(NOCHE, 12, 450, RULES))).toBe('2027-02-06T01:20:00')
  })

  it('la última llega al final después de medianoche, y sigue siendo de esa noche', () => {
    // La 23 sale 23:40 y tarda 60 minutos en hacer 900 metros: 00:40 del sábado.
    const llegada = passTime(NOCHE, 23, 900, RULES)
    expect(iso(llegada)).toBe('2027-02-06T03:40:00')
    expect(nocheLogica(llegada)).toBe(NOCHE)
  })

  it('un recorrido de 1.000 metros se hace en los 66 minutos del reglamento', () => {
    const minutos =
      (passTime(NOCHE, 1, 1000, RULES).getTime() - departureTime(NOCHE, 1, RULES).getTime()) /
      60_000
    expect(minutos).toBeCloseTo(66.67, 1)
  })

  it('con otra separación cambia la velocidad', () => {
    const reglas = paradeRules({ desfile_separacion_m: 300 })
    // A 30 metros por minuto, 450 metros son 15 minutos.
    expect(iso(passTime(NOCHE, 1, 450, reglas))).toBe('2027-02-05T23:15:00')
  })

  it('rechaza una distancia negativa y unas reglas sin sentido', () => {
    expect(() => passTime(NOCHE, 1, -5, RULES)).toThrow(RangeError)
    expect(() => passTime(NOCHE, 1, 100, { ...RULES, intervalMin: 0 })).toThrow(RangeError)
    expect(() => passTime(NOCHE, 1, 100, { ...RULES, gapM: -150 })).toThrow(RangeError)
  })
})
