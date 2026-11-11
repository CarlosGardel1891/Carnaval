export const MONTEVIDEO_TZ = 'America/Montevideo'

/** Hora (local de Montevideo) en la que empieza una nueva noche lógica. */
const NIGHT_CUTOFF_HOUR = 6

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MONTEVIDEO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

interface MontevideoParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function partsInMontevideo(instant: Date): MontevideoParts {
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('Invalid date')
  }
  const parts: Record<string, number> = {}
  for (const { type, value } of formatter.formatToParts(instant)) {
    if (type !== 'literal') parts[type] = Number(value)
  }
  return {
    year: parts.year ?? NaN,
    month: parts.month ?? NaN,
    day: parts.day ?? NaN,
    hour: parts.hour ?? NaN,
    minute: parts.minute ?? NaN,
  }
}

function toIsoDate(year: number, month: number, day: number): string {
  // Date.UTC normaliza desbordes (día 0 = último día del mes anterior).
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

/** Fecha de calendario (YYYY-MM-DD) en Montevideo, sin depender de la zona del dispositivo. */
export function calendarDateInMontevideo(instant: Date = new Date()): string {
  const { year, month, day } = partsInMontevideo(instant)
  return toIsoDate(year, month, day)
}

/**
 * Noche lógica (YYYY-MM-DD) a la que pertenece un instante: antes de las 06:00 de
 * Montevideo cuenta como la noche anterior (00:40 del sábado = noche del viernes).
 */
export function nocheLogica(instant: Date = new Date()): string {
  const { year, month, day, hour } = partsInMontevideo(instant)
  return toIsoDate(year, month, hour < NIGHT_CUTOFF_HOUR ? day - 1 : day)
}

/** Minutos transcurridos desde las 00:00 de Montevideo (las 12:30 son 750). */
export function minutesOfDayInMontevideo(instant: Date = new Date()): number {
  const { hour, minute } = partsInMontevideo(instant)
  return hour * 60 + minute
}

/**
 * El instante que corresponde a una fecha (`YYYY-MM-DD`) y una hora (`HH:MM` o `HH:MM:SS`)
 * de Montevideo. Es la vuelta de `calendarDateInMontevideo`: sin offset fijo, lo resuelve
 * con la misma tabla de zonas que usa `Intl`.
 */
export function instantInMontevideo(date: string, time: string): Date {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const t = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time)
  if (!d || !t) throw new RangeError(`Fecha u hora inválida: ${date} ${time}`)
  const wall = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]))
  // Lo que marca el reloj de Montevideo en un instante, leído como si fuera UTC.
  const wallAt = (instant: number): number => {
    const p = partsInMontevideo(new Date(instant))
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  }
  // Primera aproximación con el offset de ese momento; la segunda pasada corrige si el
  // offset cambia entre una y otra (un cambio de hora).
  let instant = wall - (wallAt(wall) - wall)
  instant = wall - (wallAt(instant) - instant)
  return new Date(instant + Number(t[3] ?? 0) * 1000)
}

export interface LlamadasWindow {
  modo_llamadas_desde: string | null
  modo_llamadas_hasta: string | null
}

/**
 * Si el modo Llamadas está activo en un instante: depende sólo de las fechas de la
 * temporada (ambas inclusive) comparadas con la noche lógica, nunca del tipo de evento.
 */
export function modoLlamadasActivo(instant: Date, temporada: LlamadasWindow): boolean {
  const { modo_llamadas_desde: from, modo_llamadas_hasta: to } = temporada
  if (!from || !to) return false
  const night = nocheLogica(instant)
  return night >= from && night <= to
}
