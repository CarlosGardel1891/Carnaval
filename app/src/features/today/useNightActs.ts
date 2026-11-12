import { useMemo } from 'react'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchNightActs, type Act, type Coords } from '../../lib/api'
import { distanceMeters } from '../../lib/distance'

/** Cada cuánto se vuelve a pedir la grilla con la app al frente. */
export const REFRESH_MS = 5 * 60_000

export interface NightActsFilters {
  onlyFree?: boolean
  /** Sólo los conjuntos seguidos («mis conjuntos»). */
  onlyFollowed?: boolean
}

export interface NightActsOptions extends NightActsFilters {
  /**
   * La posición del usuario, con «cerca mío» prendido. No va a la base ni a la clave de la
   * consulta: sólo se usa acá, en el teléfono, para calcular las distancias (decisión 90).
   */
  origin?: Coords | null
}

export function nightActsKey(noche: string, onlyFree: boolean, onlyFollowed: boolean) {
  return ['actuaciones', noche, { gratis: onlyFree, mios: onlyFollowed }] as const
}

/** Si la consulta es de «mis conjuntos»: hay que volver a pedirla cuando cambian los seguidos. */
export function isFollowedActsKey(queryKey: readonly unknown[]): boolean {
  const filters = queryKey[2]
  return (
    queryKey[0] === 'actuaciones' &&
    typeof filters === 'object' &&
    filters !== null &&
    'mios' in filters &&
    filters.mios === true
  )
}

/**
 * La consulta de las actuaciones de una noche. Sin filtros, la clave es la misma en el
 * pizarrón, el mapa y la ficha de escenario: comparten la consulta.
 *
 * Se vuelve a pedir cada `REFRESH_MS` sólo con la app al frente, y al volver al frente
 * si lo que hay tiene más de un minuto (ver `initLifecycle`).
 */
export function nightActsQuery(noche: string, filters: NightActsFilters = {}) {
  const onlyFree = filters.onlyFree ?? false
  const onlyFollowed = filters.onlyFollowed ?? false

  return queryOptions({
    queryKey: nightActsKey(noche, onlyFree, onlyFollowed),
    queryFn: () => fetchNightActs({ noche, onlyFree, onlyFollowed }),
    staleTime: 60_000,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    // «Mis conjuntos» no se guarda en el teléfono: depende de la sesión.
    meta: { persist: !onlyFollowed },
  })
}

/**
 * Las mismas actuaciones, cada una con los metros desde `origin` hasta su punto (el de la
 * actuación o el del escenario). Sin punto cargado, la distancia queda en null.
 */
export function withDistances(acts: Act[], origin: Coords): Act[] {
  return acts.map((act) => ({
    ...act,
    distancia_m:
      act.lat === null || act.lng === null
        ? null
        : distanceMeters(origin, { lat: act.lat, lng: act.lng }),
  }))
}

export function useNightActs(noche: string, options: NightActsOptions = {}) {
  const { origin = null, onlyFree, onlyFollowed } = options
  const query = useQuery({
    ...nightActsQuery(noche, { onlyFree, onlyFollowed }),
    // Al cambiar un filtro se sigue viendo lo anterior mientras llega lo nuevo; al
    // cambiar de noche no, para no mostrar la grilla de otra noche.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === noche ? previous : undefined,
  })
  const acts = query.data
  const lat = origin?.lat
  const lng = origin?.lng
  const data = useMemo(
    () =>
      acts && lat !== undefined && lng !== undefined ? withDistances(acts, { lat, lng }) : acts,
    [acts, lat, lng],
  )
  return { ...query, data }
}
