import type { Database, Tables, Temporada } from '@cuerda/shared'
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

/** Un escenario con ubicación: su punto fijo o, si es itinerante, una parada de la noche. */
export type LocatedStage = Nullable<
  Functions['escenarios_cercanos']['Returns'][number],
  'tipo' | 'barrio' | 'direccion' | 'gratis' | 'precio_texto'
>

/** Lo que la ficha muestra de un escenario. La ubicación no viene acá (ver `fetchLocatedStages`). */
export type Stage = Pick<
  Tables<'escenarios'>,
  | 'id'
  | 'slug'
  | 'nombre'
  | 'tipo'
  | 'barrio'
  | 'direccion'
  | 'gratis'
  | 'precio_texto'
  | 'itinerante'
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

/** Centro de Montevideo: desde acá se mide para traer «todos» los escenarios con ubicación. */
export const MONTEVIDEO_CENTER: Coords = { lat: -34.9058, lng: -56.1913 }
const WHOLE_CITY_M = 100_000

/**
 * Los escenarios activos con ubicación. `escenarios_cercanos` devuelve una fila por
 * escenario: de un itinerante sólo trae una parada, así que sus paradas de la noche se
 * sacan de las actuaciones (ver `mapMarkers`).
 */
export async function fetchLocatedStages(noche: string): Promise<LocatedStage[]> {
  const { data, error } = await supabase.rpc('escenarios_cercanos', {
    p_lat: MONTEVIDEO_CENTER.lat,
    p_lng: MONTEVIDEO_CENTER.lng,
    p_radio_m: WHOLE_CITY_M,
    p_noche: noche,
  })
  if (error) throw error
  return data
}

/** La participación de un conjunto en una temporada. `en_concurso` nulo es «pendiente». */
export type GroupSeason = Pick<
  Tables<'conjunto_temporada'>,
  'temporada_id' | 'en_concurso' | 'en_llamadas'
>

/** Un conjunto del catálogo, con lo que hace falta para listarlo y buscarlo. */
export interface Group {
  id: number
  slug: string
  nombre: string
  categoria: Tables<'conjuntos'>['categoria']
  barrio: string | null
  foto_url: string | null
  /** Nombre y alias pasados por `norm` en la base: contra esto se busca. */
  claves: string[]
  temporadas: GroupSeason[]
}

/** Todo el catálogo de conjuntos, por nombre, con su participación por temporada. */
export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('conjuntos')
    .select(
      'id, slug, nombre, categoria, barrio, foto_url, nombre_norm, alias_norm, conjunto_temporada(temporada_id, en_concurso, en_llamadas)',
    )
    .order('nombre_norm')
  if (error) throw error
  return data.map(({ nombre_norm, alias_norm, conjunto_temporada, ...group }) => ({
    ...group,
    claves: [nombre_norm, ...(alias_norm ?? [])].filter((key): key is string => Boolean(key)),
    temporadas: conjunto_temporada,
  }))
}

/** Un escenario por su slug, o null si no existe. */
export async function fetchStage(slug: string): Promise<Stage | null> {
  const { data, error } = await supabase
    .from('escenarios')
    .select('id, slug, nombre, tipo, barrio, direccion, gratis, precio_texto, itinerante')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}
