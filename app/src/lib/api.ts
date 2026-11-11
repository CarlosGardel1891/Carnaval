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
  /** Sólo los conjuntos que sigue el usuario de la sesión. Sin sesión no vuelve nada. */
  onlyFollowed?: boolean
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
  onlyFollowed = false,
  origin = null,
}: NightActsParams): Promise<Act[]> {
  const { data, error } = await supabase.rpc('actuaciones_de_la_noche', {
    p_noche: noche,
    p_solo_gratis: onlyFree,
    p_solo_favoritos: onlyFollowed,
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

/** Lo que la ficha muestra de un conjunto. */
export type GroupDetail = Pick<
  Tables<'conjuntos'>,
  'id' | 'slug' | 'nombre' | 'categoria' | 'barrio' | 'bio' | 'instagram' | 'facebook' | 'foto_url'
> & { temporadas: GroupSeason[] }

/** Un conjunto por su slug, o null si no existe. */
export async function fetchGroup(slug: string): Promise<GroupDetail | null> {
  const { data, error } = await supabase
    .from('conjuntos')
    .select(
      'id, slug, nombre, categoria, barrio, bio, instagram, facebook, foto_url, conjunto_temporada(temporada_id, en_concurso, en_llamadas)',
    )
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const { conjunto_temporada, ...group } = data
  return { ...group, temporadas: conjunto_temporada }
}

/** Una actuación que le queda a un conjunto. Igual que `Act`: se corrigen las columnas que pueden venir vacías. */
export type UpcomingAct = Nullable<
  Functions['proximas_de_conjunto']['Returns'][number],
  | 'etapa_rueda'
  | 'etapa_numero'
  | 'escenario_tipo'
  | 'escenario_barrio'
  | 'direccion'
  | 'gratis'
  | 'precio_texto'
  | 'itinerante'
  | 'lat'
  | 'lng'
>

/** Lo que le queda a un conjunto desde esa noche lógica (incluida), por hora. */
export async function fetchUpcomingActs(groupId: number, noche: string): Promise<UpcomingAct[]> {
  const { data, error } = await supabase.rpc('proximas_de_conjunto', {
    p_conjunto_id: groupId,
    p_noche: noche,
  })
  if (error) throw error
  return data
}

// ---------------------------------------------------------------- calendario

/** Un evento del calendario. Las fechas son puras (`YYYY-MM-DD`), sin hora. */
export type CalendarEvent = Pick<
  Tables<'eventos'>,
  | 'id'
  | 'slug'
  | 'tipo'
  | 'nombre'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'lugar'
  | 'estado'
  | 'info'
  | 'fuente_url'
  | 'entradas_url'
  | 'entradas_texto'
>

const EVENT_COLUMNS =
  'id, slug, tipo, nombre, fecha_inicio, fecha_fin, lugar, estado, info, fuente_url, entradas_url, entradas_texto'

/** Los eventos de una temporada, por fecha (pretemporada incluida). */
export async function fetchEvents(seasonId: number): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select(EVENT_COLUMNS)
    .eq('temporada_id', seasonId)
    .order('fecha_inicio')
    .order('fecha_fin')
    .order('nombre')
  if (error) throw error
  return data
}

/** Un evento por su slug, o null si no existe. */
export async function fetchEvent(slug: string): Promise<CalendarEvent | null> {
  const { data, error } = await supabase
    .from('eventos')
    .select(EVENT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

// ---------------------------------------------------------------- Concurso

/**
 * Una fila del fixture del Concurso: un conjunto en una noche (etapa). En una etapa que
 * todavía no tiene conjuntos cargados, todo lo de la actuación viene vacío.
 */
export type FixtureRow = Nullable<
  Functions['fixture_del_concurso']['Returns'][number],
  | 'actuacion_id'
  | 'inicio'
  | 'estado'
  | 'conjunto_id'
  | 'conjunto_slug'
  | 'conjunto_nombre'
  | 'conjunto_categoria'
>

/** El fixture del Concurso de un año, por rueda, etapa y hora. Vacío si no está publicado. */
export async function fetchContestFixture(year: number): Promise<FixtureRow[]> {
  const { data, error } = await supabase.rpc('fixture_del_concurso', { p_anio: year })
  if (error) throw error
  return data
}

// ---------------------------------------------------------------- Llamadas

/** Una noche del Desfile de Llamadas: el evento, con su horario y el estado de su recorrido. */
export type ParadeEvent = Pick<
  Tables<'eventos'>,
  | 'id'
  | 'temporada_id'
  | 'slug'
  | 'nombre'
  | 'fecha_inicio'
  | 'lugar'
  | 'desfile_inicio'
  | 'desfile_intervalo_min'
  | 'desfile_separacion_m'
  | 'desfile_atraso_min'
  | 'recorrido_estado'
  | 'recorrido_fuente_url'
>

/** Las noches del Desfile de Llamadas de una temporada, por fecha. */
export async function fetchParadeEvents(seasonId: number): Promise<ParadeEvent[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select(
      'id, temporada_id, slug, nombre, fecha_inicio, lugar, desfile_inicio, desfile_intervalo_min, desfile_separacion_m, desfile_atraso_min, recorrido_estado, recorrido_fuente_url',
    )
    .eq('temporada_id', seasonId)
    .eq('tipo', 'llamadas')
    .order('fecha_inicio')
    .order('slug')
  if (error) throw error
  return data
}

/** Un lugar del orden de desfile. */
export type ParadeSlot = Nullable<
  Functions['orden_del_desfile']['Returns'][number],
  'conjunto_barrio'
>

/** El orden de desfile de una noche, por posición. Vacío si todavía no se publicó. */
export async function fetchParadeOrder(eventId: number): Promise<ParadeSlot[]> {
  const { data, error } = await supabase.rpc('orden_del_desfile', { p_evento_id: eventId })
  if (error) throw error
  return data
}

/** Una esquina del recorrido, con los metros que lleva el desfile desde la salida. */
export type RouteCorner = Functions['recorrido_del_desfile']['Returns'][number]

/** Las esquinas del recorrido de una noche, de la salida a la llegada. */
export async function fetchParadeRoute(eventId: number): Promise<RouteCorner[]> {
  const { data, error } = await supabase.rpc('recorrido_del_desfile', { p_evento_id: eventId })
  if (error) throw error
  return data
}

/** Un corte de calle o una prohibición de estacionar. El tramo y el horario pueden faltar. */
export type StreetClosure = Omit<
  Functions['cortes_del_desfile']['Returns'][number],
  'desde' | 'hasta' | 'puntos'
> & {
  desde: string | null
  hasta: string | null
  /** El tramo, como lista de [longitud, latitud]. */
  puntos: [number, number][] | null
}

/** Los cortes de calle de una noche. */
export async function fetchStreetClosures(eventId: number): Promise<StreetClosure[]> {
  const { data, error } = await supabase.rpc('cortes_del_desfile', { p_evento_id: eventId })
  if (error) throw error
  return data as StreetClosure[]
}

// ---------------------------------------------------------------- sesión y Seguir

/** El usuario de la sesión guardada en el teléfono, o null si no hay (o ya no sirve). */
export async function getUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session?.user.id ?? null
}

/** Avisa cada vez que cambia el usuario de la sesión. Devuelve cómo dejar de escuchar. */
export function onUserChange(listener: (userId: string | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session?.user.id ?? null)
  })
  return () => data.subscription.unsubscribe()
}

/** Con la app al frente la sesión se renueva sola; en segundo plano, no. */
export function setAuthActive(active: boolean): void {
  void (active ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh())
}

/** La sesión anónima se crea recién acá, con el primer «Seguir» (decisión 44). */
async function ensureSession(): Promise<void> {
  if (await getUserId()) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

/** Si el alta anónima chocó con el límite por IP de Supabase (decisión 23). */
export function isRateLimited(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 429
}

/** Ids de los conjuntos que sigue el usuario de la sesión. Sin sesión, ninguno. */
export async function fetchFollowed(): Promise<number[]> {
  if (!(await getUserId())) return []
  const { data, error } = await supabase.from('favoritos').select('conjunto_id')
  if (error) throw error
  return data.map((row) => row.conjunto_id)
}

/**
 * Errores que dicen que la sesión guardada ya no sirve del lado de la base: el usuario
 * anónimo se borró (23503, la FK a `auth.users`) o el token no se acepta.
 */
const SESSION_GONE = new Set(['23503', 'PGRST301', 'PGRST303'])
const ALREADY_FOLLOWED = '23505'

/**
 * Sigue un conjunto. Si no hay sesión, crea la anónima; si la que había ya no sirve, la
 * descarta, crea otra y prueba una vez más.
 */
export async function followGroup(groupId: number): Promise<void> {
  const insert = () => supabase.from('favoritos').insert({ conjunto_id: groupId })
  await ensureSession()
  let { error } = await insert()
  if (error && SESSION_GONE.has(error.code)) {
    await supabase.auth.signOut({ scope: 'local' })
    await ensureSession()
    ;({ error } = await insert())
  }
  if (error && error.code !== ALREADY_FOLLOWED) throw error
}

/** Deja de seguir un conjunto. Sin sesión no hay nada que borrar. */
export async function unfollowGroup(groupId: number): Promise<void> {
  if (!(await getUserId())) return
  const { error } = await supabase.from('favoritos').delete().eq('conjunto_id', groupId)
  if (error) throw error
}

/**
 * Registra el token de push de este teléfono para el usuario de la sesión, o lo reasigna
 * si era de otro (reinstalación). Hace falta sesión.
 */
export async function registerPushDevice(
  token: string,
  platform: Database['public']['Enums']['plataforma_push'],
  language: Database['public']['Enums']['idioma_app'],
): Promise<void> {
  const { error } = await supabase.rpc('registrar_dispositivo_push', {
    p_token: token,
    p_plataforma: platform,
    p_idioma: language,
  })
  if (error) throw error
}

// ---------------------------------------------------------------- escenarios

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
