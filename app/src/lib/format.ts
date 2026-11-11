import { MONTEVIDEO_TZ } from '@cuerda/shared'

/**
 * Formato de fechas, horas y distancias. Dos reglas: las horas van siempre en la zona
 * de Montevideo (nunca la del teléfono) y todo se formatea con el idioma de la interfaz.
 */

/**
 * Idioma para `Intl`. Si el idioma del dispositivo es una variante regional del de la
 * interfaz (`es-UY` con la interfaz en `es`), se usa esa variante; si no (dispositivo en
 * francés, interfaz en español), manda el de la interfaz, para no mezclar idiomas.
 */
export function formatLocale(deviceLanguage: string | undefined, uiLanguage: string): string {
  if (!deviceLanguage) return uiLanguage
  return deviceLanguage === uiLanguage || deviceLanguage.startsWith(`${uiLanguage}-`)
    ? deviceLanguage
    : uiLanguage
}

/** Formatea una fecha pura (YYYY-MM-DD) sin que la zona del dispositivo corra el día. */
export function formatIsoDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

/** Una noche (YYYY-MM-DD) con el día de la semana: «jueves, 28 de enero». */
export function formatNight(noche: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${noche}T00:00:00Z`))
}

/** Un mes (`YYYY-MM`) con su año: «enero de 2027». */
export function formatMonth(month: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`))
}

/** El día del mes y el día de la semana abreviado de una fecha pura: «28» y «jue». */
export function formatDayParts(
  isoDate: string,
  locale: string,
): { weekday: string; dayOfMonth: string } {
  const date = new Date(`${isoDate}T00:00:00Z`)
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date)
  return {
    weekday: part({ weekday: 'short' }).replace('.', ''),
    dayOfMonth: part({ day: 'numeric' }),
  }
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>()

function timeFormatter(locale: string): Intl.DateTimeFormat {
  let formatter = timeFormatters.get(locale)
  if (!formatter) {
    // Con reloj de 24 horas, «00:40»; con el de 12, «12:40 AM» (sin cero adelante).
    const uses12h =
      new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 === true
    formatter = new Intl.DateTimeFormat(locale, {
      hour: uses12h ? 'numeric' : '2-digit',
      minute: '2-digit',
      timeZone: MONTEVIDEO_TZ,
    })
    timeFormatters.set(locale, formatter)
  }
  return formatter
}

/** La hora de un instante (ISO con zona) en Montevideo, esté donde esté el teléfono. */
export function formatTime(instant: string, locale: string): string {
  return timeFormatter(locale).format(new Date(instant))
}

/** El día y la hora de un instante en Montevideo: «vie 5 feb, 12:00». */
export function formatDateTime(instant: string, locale: string): string {
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: MONTEVIDEO_TZ,
  }).format(new Date(instant))
  return `${day}, ${formatTime(instant, locale)}`
}

/**
 * «hace 5 minutos» para un lapso en milisegundos. Devuelve null si pasó menos de un
 * minuto: quien llama decide cómo decir «recién».
 */
export function formatAgo(elapsedMs: number, locale: string): string | null {
  const minutes = Math.floor(elapsedMs / 60_000)
  if (minutes < 1) return null
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'always' })
  if (minutes < 60) return relative.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return relative.format(-hours, 'hour')
  return relative.format(-Math.floor(hours / 24), 'day')
}

/** Distancia a pie: de a 10 m hasta el kilómetro, después en km con un decimal. */
export function formatDistance(meters: number, locale: string): string {
  if (meters < 995) {
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'meter' }).format(
      Math.round(meters / 10) * 10,
    )
  }
  const km = meters / 1000
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km)
}

/**
 * Distancia desde una posición aproximada: en kilómetros enteros y nunca menos de 1 km
 * (quien llama dice «menos de 1 km» o «aprox. 3 km»).
 */
export function formatRoughDistance(meters: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 0,
  }).format(Math.max(1, Math.round(meters / 1000)))
}
