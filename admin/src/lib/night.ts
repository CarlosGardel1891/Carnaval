import { calendarDateInMontevideo, instantInMontevideo } from '@cuerda/shared'

/** El día siguiente de una fecha pura (YYYY-MM-DD). */
function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

/**
 * El instante de una hora de Montevideo («HH:MM») dentro de una noche lógica: antes de las
 * 06:00 es de la madrugada siguiente y sigue siendo de esa noche (decisión 8). Es la misma
 * regla que usa la base al importar.
 */
export function nightInstant(noche: string, hora: string): string {
  const day = hora < '06:00' ? nextDay(noche) : noche
  return instantInMontevideo(day, hora).toISOString()
}

/** «YYYY-MM-DDTHH:MM» de Montevideo, para un campo `datetime-local`. Vacío si no hay instante. */
export function toLocalInput(instant: string | null): string {
  if (!instant) return ''
  const at = new Date(instant)
  const time = new Intl.DateTimeFormat('es-UY', {
    timeZone: 'America/Montevideo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)
  return `${calendarDateInMontevideo(at)}T${time}`
}

/** El instante de un campo `datetime-local` leído como hora de Montevideo. Null si está vacío. */
export function fromLocalInput(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
  return match ? instantInMontevideo(match[1]!, match[2]!).toISOString() : null
}
