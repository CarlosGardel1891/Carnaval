import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  formatAgo,
  formatDistance,
  formatIsoDate,
  formatLocale,
  formatNight,
  formatTime,
} from './format'

// Intl separa «8:30» de «PM», y el número de la unidad, con espacios duros.
const plain = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ')

describe('con el reloj del sistema en Asia/Tokyo', () => {
  const systemTz = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'Asia/Tokyo'
  })
  afterAll(() => {
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('el reloj del sistema está de verdad en Tokio', () => {
    expect(new Date('2027-01-28T23:30:00Z').getHours()).toBe(8)
    expect(new Date('2027-01-28T23:30:00Z').getTimezoneOffset()).toBe(-540)
  })

  it('formatTime muestra la hora de Montevideo, no la del teléfono', () => {
    // 20:30 de Montevideo son las 08:30 del día siguiente en Tokio.
    expect(formatTime('2027-01-28T23:30:00+00:00', 'es')).toBe('20:30')
    expect(formatTime('2027-01-28T20:30:00-03:00', 'es')).toBe('20:30')
    expect(formatTime('2027-01-29T03:40:00+00:00', 'es')).toBe('00:40')
  })

  it('formatTime usa el formato del idioma activo', () => {
    expect(plain(formatTime('2027-01-28T23:30:00+00:00', 'en'))).toBe('8:30 PM')
    expect(plain(formatTime('2027-01-29T03:40:00+00:00', 'en'))).toBe('12:40 AM')
    expect(formatTime('2027-01-29T03:40:00+00:00', 'en-GB')).toBe('00:40')
  })

  it('las fechas puras no se corren de día', () => {
    expect(formatIsoDate('2027-01-21', 'es')).toBe('21 de enero')
    expect(formatNight('2027-01-28', 'es')).toBe('jueves, 28 de enero')
    expect(formatNight('2027-01-28', 'en')).toBe('Thursday, January 28')
  })
})

describe('formatAgo', () => {
  it('no dice nada antes del minuto', () => {
    expect(formatAgo(0, 'es')).toBeNull()
    expect(formatAgo(59_999, 'es')).toBeNull()
  })

  it('cuenta minutos, horas y días', () => {
    expect(formatAgo(60_000, 'es')).toBe('hace 1 minuto')
    expect(formatAgo(5 * 60_000 + 30_000, 'es')).toBe('hace 5 minutos')
    expect(formatAgo(2 * 3_600_000, 'es')).toBe('hace 2 horas')
    expect(formatAgo(49 * 3_600_000, 'es')).toBe('hace 2 días')
    expect(formatAgo(5 * 60_000, 'en')).toBe('5 minutes ago')
  })
})

describe('formatDistance', () => {
  it('redondea a 10 m hasta el kilómetro y después pasa a km', () => {
    expect(plain(formatDistance(347, 'es'))).toBe('350 m')
    expect(plain(formatDistance(994, 'es'))).toBe('990 m')
    expect(plain(formatDistance(996, 'es'))).toBe('1 km')
    expect(plain(formatDistance(1234, 'es'))).toBe('1,2 km')
    expect(plain(formatDistance(1234, 'en'))).toBe('1.2 km')
    expect(plain(formatDistance(12_600, 'es'))).toBe('13 km')
  })
})

describe('formatLocale', () => {
  it('usa la variante regional del dispositivo sólo si es del idioma de la interfaz', () => {
    expect(formatLocale('es-UY', 'es')).toBe('es-UY')
    expect(formatLocale('en-GB', 'en')).toBe('en-GB')
    expect(formatLocale('es', 'es')).toBe('es')
    expect(formatLocale('fr-FR', 'es')).toBe('es')
    expect(formatLocale(undefined, 'es')).toBe('es')
  })
})
