// Fechas y horas del panel, siempre en Montevideo y nunca en la zona del navegador.

const timeFormat = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'America/Montevideo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const dateTimeFormat = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'America/Montevideo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const nightFormat = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** «20:50», la hora de Montevideo de un instante. */
export const formatTime = (instant: string | Date) => timeFormat.format(new Date(instant))

/** «28/02/2026, 20:50», en Montevideo. */
export const formatDateTime = (instant: string | Date) => dateTimeFormat.format(new Date(instant))

/** «sábado, 28 de febrero de 2026», de una fecha pura (YYYY-MM-DD). */
export const formatNight = (date: string) => nightFormat.format(new Date(`${date}T00:00:00Z`))

export const isIsoDate = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text)
