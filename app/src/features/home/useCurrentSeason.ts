import { useQuery } from '@tanstack/react-query'
import { nocheLogica, type Temporada } from '@cuerda/shared'
import { supabase } from '../../lib/supabase'

/**
 * Temporada vigente o, si no hay, la próxima. Se compara contra la noche lógica:
 * la madrugada después de la última noche todavía es temporada (hasta las 06:00).
 */
export function useCurrentSeason() {
  return useQuery({
    queryKey: ['temporadas', 'current'],
    queryFn: async (): Promise<Temporada | null> => {
      const { data, error } = await supabase
        .from('temporadas')
        .select('*')
        .gte('fecha_fin', nocheLogica())
        .order('fecha_inicio')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
