import type { Temporada } from '@cuerda/shared'
import { supabase } from './supabase'

/**
 * Todas las consultas a la base pasan por acá: las pantallas no importan `supabase`
 * directo, así los tests de componentes mockean sólo este módulo.
 */

/**
 * Temporada vigente o, si no hay, la próxima. Se compara contra la noche lógica:
 * la madrugada después de la última noche todavía es temporada (hasta las 06:00).
 */
export async function fetchCurrentSeason(noche: string): Promise<Temporada | null> {
  const { data, error } = await supabase
    .from('temporadas')
    .select('*')
    .gte('fecha_fin', noche)
    .order('fecha_inicio')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
