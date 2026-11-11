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
