import type { Database, Temporada } from '@cuerda/shared'
import { supabase } from './supabase'

/**
 * Todo lo que la app le pide a la base pasa por acá. Los tests de pantallas mockean
 * este módulo entero.
 */

type Functions = Database['public']['Functions']
type Nullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null }

/**
 * Una actuación de la noche. Los tipos generados marcan todas las columnas de las
 * funciones como no nulas; acá se corrigen las que en la base pueden venir vacías.
 */
export type Act = Nullable<
  Functions['actuaciones_de_la_noche']['Returns'][number],
  | 'etapa_rueda'
  | 'etapa_numero'
  | 'conjunto_foto_url'
  | 'escenario_tipo'
  | 'escenario_barrio'
  | 'direccion'
  | 'gratis'
  | 'precio_texto'
  | 'itinerante'
  | 'lat'
  | 'lng'
  | 'distancia_m'
>

export interface Coords {
  lat: number
  lng: number
}

export interface NightActsParams {
  noche: string
  onlyFree?: boolean
  /** Si viene, la base devuelve `distancia_m` desde ese punto. */
  origin?: Coords | null
}

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

/** Las actuaciones de una noche lógica, ordenadas por hora. */
export async function fetchNightActs({
  noche,
  onlyFree = false,
  origin = null,
}: NightActsParams): Promise<Act[]> {
  const { data, error } = await supabase.rpc('actuaciones_de_la_noche', {
    p_noche: noche,
    p_solo_gratis: onlyFree,
    ...(origin ? { p_lat: origin.lat, p_lng: origin.lng } : {}),
  })
  if (error) throw error
  return data
}
