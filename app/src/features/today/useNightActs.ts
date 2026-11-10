import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchNightActs, type Coords } from '../../lib/api'

/** Cada cuánto se vuelve a pedir la grilla con la app al frente. */
export const REFRESH_MS = 5 * 60_000

export interface NightActsOptions {
  onlyFree?: boolean
  origin?: Coords | null
}

/** ~11 m: alcanza para ordenar por cercanía y no manda la posición exacta. */
function roundCoords({ lat, lng }: Coords): Coords {
  return { lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4 }
}

export function nightActsKey(noche: string, onlyFree: boolean, origin: Coords | null) {
  return ['actuaciones', noche, { gratis: onlyFree }, origin] as const
}

/**
 * La consulta de las actuaciones de una noche. Sin filtros, la clave es la misma en el
 * pizarrón, el mapa y la ficha de escenario: comparten la consulta.
 *
 * Se vuelve a pedir cada `REFRESH_MS` sólo con la app al frente, y al volver al frente
 * si lo que hay tiene más de un minuto (ver `initLifecycle`).
 */
export function nightActsQuery(noche: string, options: NightActsOptions = {}) {
  const onlyFree = options.onlyFree ?? false
  const origin = options.origin ? roundCoords(options.origin) : null

  return queryOptions({
    queryKey: nightActsKey(noche, onlyFree, origin),
    queryFn: () => fetchNightActs({ noche, onlyFree, origin }),
    staleTime: 60_000,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

export function useNightActs(noche: string, options: NightActsOptions = {}) {
  return useQuery({
    ...nightActsQuery(noche, options),
    // Al cambiar un filtro se sigue viendo lo anterior mientras llega lo nuevo; al
    // cambiar de noche no, para no mostrar la grilla de otra noche.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === noche ? previous : undefined,
  })
}
