/** Formatea una fecha pura (YYYY-MM-DD) sin que la zona del dispositivo corra el día. */
export function formatIsoDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}
