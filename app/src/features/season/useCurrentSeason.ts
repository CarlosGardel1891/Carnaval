import { useQuery } from '@tanstack/react-query'
import { fetchCurrentSeason } from '../../lib/api'

/** Temporada vigente en esa noche o, si no hay, la próxima (ver `fetchCurrentSeason`). */
export function useCurrentSeason(noche: string) {
  return useQuery({
    queryKey: ['temporadas', 'desde', noche],
    queryFn: () => fetchCurrentSeason(noche),
    staleTime: 60 * 60_000,
  })
}
