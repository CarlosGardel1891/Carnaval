import { queryOptions, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { nocheLogica } from '@cuerda/shared'
import {
  fetchCurrentSeason,
  fetchParadeEvents,
  fetchParadeOrder,
  fetchParadeRoute,
  fetchStreetClosures,
  type ParadeEvent,
} from '../../lib/api'
import { useNow } from '../../lib/useNow'
import { REFRESH_MS } from '../today/useNightActs'
import { pickNight } from './parade'

/**
 * Las consultas del modo Llamadas. Todas llevan claves que no cambian con el día y se guardan
 * una semana en el teléfono (decisión 65): en el desfile la red se satura, y lo último que se
 * bajó tiene que seguir ahí aunque la app se haya abierto por última vez hace días.
 */

/** Cuánto vale en el teléfono lo del modo Llamadas. */
export const LLAMADAS_CACHE_MS = 7 * 24 * 60 * 60_000
const offline = { persistMs: LLAMADAS_CACHE_MS }

/**
 * La temporada de las Llamadas. Es la misma que la vigente, pero con una clave fija: la de
 * `useCurrentSeason` lleva la noche y, sin red, al día siguiente ya no estaría en la caché.
 */
export const llamadasSeasonQuery = (today: string) =>
  queryOptions({
    queryKey: ['llamadas', 'temporada'],
    queryFn: () => fetchCurrentSeason(today),
    staleTime: 60 * 60_000,
    meta: offline,
  })

/** Las noches del desfile. Traen el horario y el atraso: se refrescan como la grilla. */
export const paradeEventsQuery = (seasonId: number) =>
  queryOptions({
    queryKey: ['llamadas', 'eventos', seasonId],
    queryFn: () => fetchParadeEvents(seasonId),
    staleTime: 60_000,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    meta: offline,
  })

export const paradeOrderQuery = (eventId: number) =>
  queryOptions({
    queryKey: ['llamadas', 'orden', eventId],
    queryFn: () => fetchParadeOrder(eventId),
    staleTime: 5 * 60_000,
    meta: offline,
  })

export const paradeRouteQuery = (eventId: number) =>
  queryOptions({
    queryKey: ['llamadas', 'recorrido', eventId],
    queryFn: () => fetchParadeRoute(eventId),
    staleTime: 60 * 60_000,
    meta: offline,
  })

export const streetClosuresQuery = (eventId: number) =>
  queryOptions({
    queryKey: ['llamadas', 'cortes', eventId],
    queryFn: () => fetchStreetClosures(eventId),
    staleTime: 15 * 60_000,
    meta: offline,
  })

export interface Llamadas {
  /** La noche lógica de ahora, en Montevideo. */
  today: string
  /** Las noches del desfile, por fecha. */
  nights: ParadeEvent[]
  /** La noche que se está mirando: la de `?noche=`, o la de hoy, o la próxima. */
  night: ParadeEvent | null
  isPending: boolean
  isError: boolean
  /** Cuándo se bajó lo que se ve (0 si todavía no hay nada). */
  updatedAt: number
  /** Si lo que se ve es lo último guardado porque no se pudo actualizar. */
  stale: boolean
  retry: () => void
}

/** Las noches de las Llamadas de la temporada y la que se está mirando. */
export function useLlamadas(): Llamadas {
  const today = nocheLogica(useNow())
  const [params] = useSearchParams()
  const season = useQuery(llamadasSeasonQuery(today))
  const seasonId = season.data?.id
  const events = useQuery({
    ...paradeEventsQuery(seasonId as number),
    enabled: seasonId !== undefined,
  })
  const nights = events.data ?? []
  const requested = params.get('noche')
  const night = nights.find((n) => n.fecha_inicio === requested) ?? pickNight(nights, today)

  return {
    today,
    nights,
    night,
    isPending: season.isPending || (seasonId !== undefined && events.isPending),
    isError: (season.isError && !season.data) || (events.isError && !events.data),
    updatedAt: events.dataUpdatedAt,
    stale: events.isError && events.data !== undefined && !events.isFetching,
    retry: () => void (season.data ? events.refetch() : season.refetch()),
  }
}
