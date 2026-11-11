import { useQuery } from '@tanstack/react-query'
import { fetchGroups } from '../../lib/api'

/** El catálogo de conjuntos. Cambia poco: una hora de gracia. */
export function useGroups() {
  return useQuery({
    queryKey: ['conjuntos'],
    queryFn: fetchGroups,
    staleTime: 60 * 60_000,
  })
}
