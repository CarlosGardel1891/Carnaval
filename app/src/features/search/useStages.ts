import { useQuery } from '@tanstack/react-query'
import { fetchStages } from '../../lib/api'

/** Los escenarios activos, para el buscador. Cambian poco: una hora de gracia. */
export function useStages() {
  return useQuery({
    queryKey: ['escenarios', 'catalogo'],
    queryFn: fetchStages,
    staleTime: 60 * 60_000,
  })
}
