import { useSearchParams } from 'react-router'
import { nocheLogica } from '@cuerda/shared'
import { useNow } from '../../lib/useNow'

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export interface Noche {
  /** La noche que se muestra (YYYY-MM-DD). */
  noche: string
  /** Si es la noche en curso: sólo entonces tiene sentido «ahora en escena». */
  isTonight: boolean
  now: Date
}

/**
 * La noche lógica que se muestra: la de ahora en Montevideo (antes de las 06:00, la
 * anterior), que cambia sola a las 06:00. Con `?noche=YYYY-MM-DD` se puede abrir otra.
 */
export function useNoche(): Noche {
  const [params] = useSearchParams()
  const now = useNow()
  const tonight = nocheLogica(now)
  const requested = params.get('noche')
  const noche = requested && isIsoDate(requested) ? requested : tonight
  return { noche, isTonight: noche === tonight, now }
}
