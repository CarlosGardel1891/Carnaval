import { instantInMontevideo } from '@cuerda/shared'

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
