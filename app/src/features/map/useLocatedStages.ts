import { useQuery } from '@tanstack/react-query'
import { fetchLocatedStages } from '../../lib/api'

/** Los escenarios con ubicación de una noche, para el mapa. Cambian poco: 5 minutos de gracia. */
export function useLocatedStages(noche: string) {
  return useQuery({
    queryKey: ['escenarios', 'con-ubicacion', noche],
    queryFn: () => fetchLocatedStages(noche),
    staleTime: 5 * 60_000,
  })
}
