import { useQuery } from '@tanstack/react-query'
import { calendarDateInMontevideo, type Temporada } from '@cuerda/shared'
import { supabase } from '../../lib/supabase'

/** Temporada vigente o, si no hay, la próxima. */
export function useCurrentSeason() {
  return useQuery({
    queryKey: ['temporadas', 'current'],
    queryFn: async (): Promise<Temporada | null> => {
      const { data, error } = await supabase
        .from('temporadas')
        .select('*')
        .gte('fecha_fin', calendarDateInMontevideo())
        .order('fecha_inicio')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
