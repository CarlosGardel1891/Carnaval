import { useQuery } from '@tanstack/react-query'
import { nocheLogica } from '@cuerda/shared'
import { fetchCurrentSeason } from '../../lib/api'

/** Temporada vigente o, si no hay, la próxima (ver `fetchCurrentSeason`). */
export function useCurrentSeason() {
  return useQuery({
    queryKey: ['temporadas', 'current'],
    queryFn: () => fetchCurrentSeason(nocheLogica()),
  })
}
