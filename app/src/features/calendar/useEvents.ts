import { useQuery } from '@tanstack/react-query'
import { nocheLogica } from '@cuerda/shared'
import { fetchEvents } from '../../lib/api'
import { useNow } from '../../lib/useNow'
import { useCurrentSeason } from '../season/useCurrentSeason'

/** Ruta de la ficha de un evento. */
export function eventPath(slug: string): string {
  return `/calendario/${encodeURIComponent(slug)}`
}

/**
 * Los eventos de la temporada vigente (o de la próxima, si todavía no empezó ninguna) y
 * el «hoy» con el que se marcan: la noche lógica de Montevideo. Cambian poco: una hora de
 * gracia.
 */
export function useSeasonEvents() {
  const today = nocheLogica(useNow())
  const season = useCurrentSeason(today)
  const seasonId = season.data?.id
  const events = useQuery({
    queryKey: ['eventos', seasonId],
    queryFn: () => fetchEvents(seasonId as number),
    enabled: seasonId !== undefined,
    staleTime: 60 * 60_000,
  })
  return { today, season, events }
}
