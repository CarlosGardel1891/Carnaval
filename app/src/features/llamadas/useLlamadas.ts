import { useEffect } from 'react'
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { nocheLogica } from '@cuerda/shared'
import {
  fetchCurrentSeason,
  fetchGroups,
  fetchParadeEvents,
  fetchParadeOrder,
  fetchParadeRoute,
  fetchStreetClosures,
  type ParadeEvent,
} from '../../lib/api'
import { LONG_CACHE_MAX_AGE_MS, LONG_LIVED_KEY } from '../../lib/queryCache'
import { useNow } from '../../lib/useNow'
import { REFRESH_MS } from '../today/useNightActs'
import { pickNight } from './parade'

/**
 * Las consultas del modo Llamadas. Todas llevan `llamadas` adelante en la clave, que no cambia
 * con el día: así se guardan una semana en el teléfono (decisión 65, `lib/queryCache.ts`). En
 * el desfile la red se satura, y lo último que se bajó tiene que seguir ahí aunque la app se
 * haya abierto por última vez hace días.
 */
const KEY = LONG_LIVED_KEY
const offline = { gcTime: LONG_CACHE_MAX_AGE_MS }

/**
 * La temporada de las Llamadas. Es la misma que la vigente, pero con una clave fija: la de
 * `useCurrentSeason` lleva la noche y, sin red, al día siguiente ya no estaría en la caché.
 */
export const llamadasSeasonQuery = (today: string) =>
  queryOptions({
    queryKey: [KEY, 'temporada'],
    queryFn: () => fetchCurrentSeason(today),
    staleTime: 60 * 60_000,
    ...offline,
  })

/** Las noches del desfile. Traen el horario y el atraso: se refrescan como la grilla. */
export const paradeEventsQuery = (seasonId: number) =>
  queryOptions({
    queryKey: [KEY, 'eventos', seasonId],
    queryFn: () => fetchParadeEvents(seasonId),
    staleTime: 60_000,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    ...offline,
  })

export const paradeOrderQuery = (eventId: number) =>
  queryOptions({
    queryKey: [KEY, 'orden', eventId],
    queryFn: () => fetchParadeOrder(eventId),
    staleTime: 5 * 60_000,
    ...offline,
  })

export const paradeRouteQuery = (eventId: number) =>
  queryOptions({
    queryKey: [KEY, 'recorrido', eventId],
    queryFn: () => fetchParadeRoute(eventId),
    staleTime: 60 * 60_000,
    ...offline,
  })

export const streetClosuresQuery = (eventId: number) =>
  queryOptions({
    queryKey: [KEY, 'cortes', eventId],
    queryFn: () => fetchStreetClosures(eventId),
    staleTime: 15 * 60_000,
    ...offline,
  })

/**
 * El catálogo de conjuntos, para listar las clasificadas mientras no esté el orden. Es el mismo
 * de `useGroups`, con clave propia para que dure lo mismo que el resto del modo.
 */
export const llamadasGroupsQuery = () =>
  queryOptions({
    queryKey: [KEY, 'conjuntos'],
    queryFn: fetchGroups,
    staleTime: 60 * 60_000,
    ...offline,
  })

/**
 * Baja todo el modo Llamadas antes de que haga falta (decisión 65): desde que empieza la
 * temporada y hasta la última noche del desfile, al abrir la app se piden las noches y, de cada
 * una, el orden, el recorrido y los cortes, aunque no se entre a la pestaña. Lo que ya está
 * fresco no se vuelve a pedir, y si no hay red no pasa nada: queda lo guardado.
 *
 * Se monta una sola vez, en el marco de la app.
 */
export function usePrefetchLlamadas(): void {
  const today = nocheLogica(useNow())
  const queryClient = useQueryClient()
  const season = useQuery(llamadasSeasonQuery(today)).data
  const seasonId = season?.id
  const until = season?.modo_llamadas_hasta
  const wanted =
    seasonId !== undefined && !!until && today >= season!.fecha_inicio && today <= until

  useEffect(() => {
    if (!wanted) return
    void queryClient
      .fetchQuery(paradeEventsQuery(seasonId))
      .then((nights) =>
        Promise.all([
          queryClient.prefetchQuery(llamadasGroupsQuery()),
          ...(nights ?? []).flatMap((night) => [
            queryClient.prefetchQuery(paradeOrderQuery(night.id)),
            queryClient.prefetchQuery(paradeRouteQuery(night.id)),
            queryClient.prefetchQuery(streetClosuresQuery(night.id)),
          ]),
        ]),
      )
      .catch(() => undefined)
  }, [wanted, seasonId, today, queryClient])
}

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
