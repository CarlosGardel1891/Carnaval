// Todo lo que habla con Supabase desde el panel. Los tests de pantallas lo reemplazan con
// `vi.mock('…/lib/api')`, que toma el doble de `__mocks__/api.ts`: al agregar una función
// acá hay que sumarla ahí.
import type { CategoriaConjunto, Enums, EstadoActuacion, Json, TipoEscenario } from '@cuerda/shared'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type TipoEvento = Enums<'tipo_evento'>
export type EstadoEvento = Enums<'estado_evento'>
export type RuedaConcurso = Enums<'rueda_concurso'>

export interface AdminSession {
  email: string
  /** Si la sesión trae el claim `app_metadata.rol = 'admin'` (decisión 23). */
  isAdmin: boolean
}

/** El email o la contraseña no coinciden con ninguna cuenta. */
export class WrongCredentialsError extends Error {}

const toAdminSession = (session: Session | null): AdminSession | null =>
  session && {
    email: session.user.email ?? '',
    isAdmin: session.user.app_metadata.rol === 'admin',
  }

export async function getSession(): Promise<AdminSession | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return toAdminSession(data.session)
}

/** Avisa cada vez que la sesión cambia (entra, sale o vence). Devuelve cómo dejar de escuchar. */
export function onSessionChange(listener: (session: AdminSession | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(toAdminSession(session))
  })
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.code === 'invalid_credentials') throw new WrongCredentialsError(error.message)
    throw error
  }
  const session = toAdminSession(data.session)
  if (!session) throw new Error('Supabase no devolvió una sesión.')
  return session
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ---------------------------------------------------------------- catálogo

export interface CatalogGroup {
  id: number
  nombre: string
  alias: string[]
  categoria: CategoriaConjunto
}

export interface CatalogStage {
  id: number
  nombre: string
  alias: string[]
  tipo: TipoEscenario | null
  itinerante: boolean | null
  activo: boolean
}

/** Los conjuntos y escenarios que existen, para elegir uno cuando un nombre no coincide. */
export async function fetchCatalog(): Promise<{ groups: CatalogGroup[]; stages: CatalogStage[] }> {
  const [groups, stages] = await Promise.all([
    supabase.from('conjuntos').select('id, nombre, alias, categoria').order('nombre'),
    supabase
      .from('escenarios')
      .select('id, nombre, alias, tipo, itinerante, activo')
      .order('nombre'),
  ])
  if (groups.error) throw groups.error
  if (stages.error) throw stages.error
  return { groups: groups.data, stages: stages.data }
}

export interface Season {
  id: number
  anio: number
  fecha_inicio: string
  fecha_fin: string
}

export async function fetchSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from('temporadas')
    .select('id, anio, fecha_inicio, fecha_fin')
    .order('anio')
  if (error) throw error
  return data
}

// ---------------------------------------------------------------- importar una grilla

/** Una línea de cartelera, como la espera la base (ver la migración del importador). */
export interface GridRow {
  n: number
  escenario: string
  escenario_id?: number
  escenario_nuevo?: string
  conjunto: string
  conjunto_id?: number
  conjunto_nuevo?: string
  hora: string
  direccion?: string
  lat?: number
  lng?: number
}

export interface PreviewRow {
  n: number
  escenario_id: number | null
  escenario_nombre: string | null
  escenario_itinerante: boolean | null
  conjunto_id: number | null
  conjunto_nombre: string | null
  inicio: string
  direccion: string | null
  estado: 'nueva' | 'cambia' | 'igual' | 'sin_coincidencia' | 'duplicada'
  actuacion_id: number | null
  inicio_actual: string | null
  direccion_actual: string | null
  estado_actual: EstadoActuacion | null
}

export async function previewGrid(noche: string, rows: GridRow[]): Promise<PreviewRow[]> {
  const { data, error } = await supabase.rpc('previsualizar_grilla', {
    p_noche: noche,
    p_filas: rows as unknown as Json,
  })
  if (error) throw error
  return data as unknown as PreviewRow[]
}

/** Lo que ya estaba cargado esa noche en los escenarios de la cartelera y no viene en ella. */
export interface Leftover {
  actuacion_id: number
  escenario_nombre: string
  conjunto_nombre: string
  inicio: string
  estado: EstadoActuacion
}

export async function fetchLeftovers(noche: string, rows: GridRow[]): Promise<Leftover[]> {
  const { data, error } = await supabase.rpc('grilla_sobrante', {
    p_noche: noche,
    p_filas: rows as unknown as Json,
  })
  if (error) throw error
  return data
}

export interface NewGroup {
  clave: string
  nombre: string
  categoria: CategoriaConjunto
}

export interface NewStage {
  clave: string
  nombre: string
  tipo: TipoEscenario
  itinerante: boolean
}

export interface PublishRequest {
  noche: string
  fuente: string
  fuenteUrl: string
  rows: GridRow[]
  aliases: { tipo: 'conjunto' | 'escenario'; id: number; alias: string }[]
  created: { conjuntos: NewGroup[]; escenarios: NewStage[] }
  leftovers: { id: number; accion: 'suspender' | 'borrar' }[]
}

export interface PublishSummary {
  nuevas: number
  cambiadas: number
  iguales: number
  suspendidas: number
  borradas: number
  conjuntos_creados: number
  escenarios_creados: number
  alias_agregados: number
}

/** Publica la grilla, todo o nada. Si la base la rechaza, el error trae su mensaje. */
export async function publishGrid(request: PublishRequest): Promise<PublishSummary> {
  const { data, error } = await supabase.rpc('publicar_grilla', {
    p_noche: request.noche,
    p_fuente: request.fuente,
    p_fuente_url: request.fuenteUrl,
    p_filas: request.rows as unknown as Json,
    p_alias: request.aliases as unknown as Json,
    p_nuevos: request.created as unknown as Json,
    p_sobrantes: request.leftovers as unknown as Json,
  })
  if (error) throw new Error(error.message, { cause: error })
  const [summary] = data
  if (!summary) throw new Error('La base no devolvió el resumen de la publicación.')
  return summary
}

// ---------------------------------------------------------------- una noche

export interface NightAct {
  id: number
  inicio: string
  estado: EstadoActuacion
  direccion_texto: string | null
  fuente: string
  fuente_url: string | null
  actualizado_en: string
  escenario: { id: number; nombre: string; itinerante: boolean | null }
  conjunto: { id: number; nombre: string }
}

/** Todas las actuaciones de una noche lógica, por hora. */
export async function fetchNightActs(noche: string): Promise<NightAct[]> {
  const { data, error } = await supabase
    .from('actuaciones')
    .select(
      'id, inicio, estado, direccion_texto, fuente, fuente_url, actualizado_en, escenario:escenarios!inner(id, nombre, itinerante), conjunto:conjuntos!inner(id, nombre)',
    )
    .eq('noche', noche)
    .order('inicio')
    .order('id')
  if (error) throw error
  return data
}

export interface ActPatch {
  inicio?: string
  escenario_id?: number
  direccion_texto?: string | null
  estado?: EstadoActuacion
}

/** Cambia una actuación. Un cambio de hora, lugar o estado encola su aviso (decisión 48). */
export async function updateAct(id: number, patch: ActPatch): Promise<void> {
  const { data, error } = await supabase.from('actuaciones').update(patch).eq('id', id).select('id')
  if (error) throw new Error(error.message, { cause: error })
  if (data.length === 0)
    throw new Error('No se guardó: la actuación ya no existe o no hay permiso.')
}

export interface NewAct {
  escenario_id: number
  conjunto_id: number
  inicio: string
  direccion_texto: string | null
  fuente: string
  fuente_url: string | null
  /** La etapa del Concurso, si es una actuación del Teatro de Verano en una noche de concurso. */
  etapa_id?: number
}

export async function addAct(act: NewAct): Promise<void> {
  const { error } = await supabase.from('actuaciones').insert(act)
  if (error) throw new Error(error.message, { cause: error })
}

export async function deleteAct(id: number): Promise<void> {
  const { data, error } = await supabase.from('actuaciones').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message, { cause: error })
  if (data.length === 0) throw new Error('No se borró: la actuación ya no existe o no hay permiso.')
}

/**
 * Pide que los avisos de cambio salgan ya, sin la espera de un minuto (decisión 72). Si
 * falla no se pierde nada: salen con la pasada de cada minuto. Devuelve si pudo.
 */
export async function sendChangeNotices(): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('avisos-de-cambios', {
      body: { sin_espera: true },
    })
    return !error
  } catch {
    return false
  }
}

export interface Suspension {
  id: number
  motivo: string | null
  creado_email: string | null
  creado_en: string
  deshecha_en: string | null
  actuaciones: number
}

export async function fetchSuspensions(noche: string): Promise<Suspension[]> {
  const { data, error } = await supabase
    .from('suspensiones')
    .select('id, motivo, creado_email, creado_en, deshecha_en, suspension_actuaciones(count)')
    .eq('noche', noche)
    .order('id', { ascending: false })
  if (error) throw error
  return data.map(({ suspension_actuaciones, ...row }) => ({
    ...row,
    actuaciones: suspension_actuaciones[0]?.count ?? 0,
  }))
}

/** Suspende la noche: todos los escenarios (`null`) o los que se pasan. Devuelve cuántas tocó. */
export async function suspendNight(
  noche: string,
  stageIds: number[] | null,
  motivo: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('suspender_noche', {
    p_noche: noche,
    ...(stageIds ? { p_escenarios: stageIds } : {}),
    ...(motivo.trim() ? { p_motivo: motivo.trim() } : {}),
  })
  if (error) throw new Error(error.message, { cause: error })
  return data[0]?.actuaciones ?? 0
}

/** Deshace una suspensión. Devuelve cuántas actuaciones volvieron a como estaban. */
export async function undoSuspension(id: number): Promise<number> {
  const { data, error } = await supabase.rpc('deshacer_suspension', { p_suspension_id: id })
  if (error) throw new Error(error.message, { cause: error })
  return data
}

// ---------------------------------------------------------------- conjuntos

export interface GroupRow {
  id: number
  slug: string
  nombre: string
  alias: string[]
  categoria: CategoriaConjunto
  barrio: string | null
  instagram: string | null
  facebook: string | null
  verificado: boolean
  fuente_url: string[]
  /** Su participación en cada temporada (decisión 26): sin fila, no participa. */
  conjunto_temporada: { temporada_id: number; en_concurso: boolean | null; en_llamadas: boolean }[]
}

export async function fetchGroups(): Promise<GroupRow[]> {
  const { data, error } = await supabase
    .from('conjuntos')
    .select(
      'id, slug, nombre, alias, categoria, barrio, instagram, facebook, verificado, fuente_url, conjunto_temporada(temporada_id, en_concurso, en_llamadas)',
    )
    .order('nombre')
  if (error) throw error
  return data
}

export type GroupFields = Omit<GroupRow, 'id' | 'conjunto_temporada'>

/** Crea (sin `id`) o cambia un conjunto. Devuelve su id. */
export async function saveGroup(id: number | null, fields: GroupFields): Promise<number> {
  const query = id
    ? supabase.from('conjuntos').update(fields).eq('id', id).select('id')
    : supabase.from('conjuntos').insert(fields).select('id')
  const { data, error } = await query
  if (error) throw new Error(error.message, { cause: error })
  const [row] = data
  if (!row) throw new Error('No se guardó: el conjunto ya no existe o no hay permiso.')
  return row.id
}

export interface Participation {
  en_concurso: boolean | null
  en_llamadas: boolean
}

/** Pone o quita (`null`) la participación de un conjunto en una temporada. */
export async function setParticipation(
  conjuntoId: number,
  temporadaId: number,
  participation: Participation | null,
): Promise<void> {
  const { error } = participation
    ? await supabase
        .from('conjunto_temporada')
        .upsert({ conjunto_id: conjuntoId, temporada_id: temporadaId, ...participation })
    : await supabase
        .from('conjunto_temporada')
        .delete()
        .eq('conjunto_id', conjuntoId)
        .eq('temporada_id', temporadaId)
  if (error) throw new Error(error.message, { cause: error })
}

// ---------------------------------------------------------------- escenarios

export interface StageRow {
  id: number
  slug: string
  nombre: string
  alias: string[]
  tipo: TipoEscenario | null
  direccion: string | null
  barrio: string | null
  precio_texto: string | null
  gratis: boolean | null
  activo: boolean
  itinerante: boolean | null
  fuente_url: string[]
  lat: number | null
  lng: number | null
}

export async function fetchStages(): Promise<StageRow[]> {
  const { data, error } = await supabase.rpc('escenarios_con_ubicacion')
  if (error) throw error
  return data as StageRow[]
}

export type StageFields = Omit<StageRow, 'id'>

/** Crea (sin `id`) o cambia un escenario, con su ubicación. Devuelve su id. */
export async function saveStage(id: number | null, fields: StageFields): Promise<number> {
  const { lat, lng, ...rest } = fields
  const row = {
    ...rest,
    // La columna es un punto de PostGIS: longitud primero.
    ubicacion: lat !== null && lng !== null ? `SRID=4326;POINT(${lng} ${lat})` : null,
  }
  const query = id
    ? supabase.from('escenarios').update(row).eq('id', id).select('id')
    : supabase.from('escenarios').insert(row).select('id')
  const { data, error } = await query
  if (error) throw new Error(error.message, { cause: error })
  const [saved] = data
  if (!saved) throw new Error('No se guardó: el escenario ya no existe o no hay permiso.')
  return saved.id
}

// ---------------------------------------------------------------- eventos

export interface EventRow {
  id: number
  temporada_id: number
  slug: string
  tipo: TipoEvento
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  lugar: string | null
  estado: EstadoEvento
  info: string | null
  fuente_url: string[]
  /** La venta de entradas es un dato de cada evento (decisión 60). */
  entradas_url: string | null
  entradas_texto: string | null
}

const EVENT_COLUMNS =
  'id, temporada_id, slug, tipo, nombre, fecha_inicio, fecha_fin, lugar, estado, info, fuente_url, entradas_url, entradas_texto'

export async function fetchEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select(EVENT_COLUMNS)
    .order('fecha_inicio')
    .order('id')
  if (error) throw error
  return data
}

export type EventFields = Omit<EventRow, 'id'>

/** Crea (sin `id`) o cambia un evento. Devuelve su id. */
export async function saveEvent(id: number | null, fields: EventFields): Promise<number> {
  const query = id
    ? supabase.from('eventos').update(fields).eq('id', id).select('id')
    : supabase.from('eventos').insert(fields).select('id')
  const { data, error } = await query
  if (error) throw new Error(error.message, { cause: error })
  const [row] = data
  if (!row) throw new Error('No se guardó: el evento ya no existe o no hay permiso.')
  return row.id
}

// ---------------------------------------------------------------- Concurso

export interface ContestStage {
  id: number
  temporada_id: number
  rueda: RuedaConcurso
  numero: number
  fecha: string
  fuente: string
  fuente_url: string | null
  /** Los conjuntos de esa noche: actuaciones del Teatro de Verano con esa etapa (decisión 57). */
  actuaciones: {
    id: number
    inicio: string
    estado: EstadoActuacion
    conjunto: { nombre: string }
  }[]
}

export async function fetchContest(): Promise<ContestStage[]> {
  const { data, error } = await supabase
    .from('etapas_concurso')
    .select(
      'id, temporada_id, rueda, numero, fecha, fuente, fuente_url, actuaciones(id, inicio, estado, conjunto:conjuntos!inner(nombre))',
    )
    .order('fecha')
    .order('numero')
    .order('inicio', { referencedTable: 'actuaciones' })
  if (error) throw error
  return data
}

export type ContestStageFields = Omit<ContestStage, 'id' | 'actuaciones'>

export async function saveContestStage(
  id: number | null,
  fields: ContestStageFields,
): Promise<number> {
  const query = id
    ? supabase.from('etapas_concurso').update(fields).eq('id', id).select('id')
    : supabase.from('etapas_concurso').insert(fields).select('id')
  const { data, error } = await query
  if (error) throw new Error(error.message, { cause: error })
  const [row] = data
  if (!row) throw new Error('No se guardó: la etapa ya no existe o no hay permiso.')
  return row.id
}

/** Borra una etapa. Sus actuaciones quedan en la grilla, sin etapa. */
export async function deleteContestStage(id: number): Promise<void> {
  const { data, error } = await supabase.from('etapas_concurso').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message, { cause: error })
  if (data.length === 0) throw new Error('No se borró: la etapa ya no existe o no hay permiso.')
}

// ---------------------------------------------------------------- Llamadas

export interface ParadeEvent {
  id: number
  nombre: string
  fecha_inicio: string
  /** «HH:MM:SS» de Montevideo. Null = la regla general (20:00). */
  desfile_inicio: string | null
  desfile_intervalo_min: number | null
  desfile_separacion_m: number | null
  desfile_atraso_min: number
  recorrido_estado: EstadoEvento | null
  recorrido_fuente_url: string[]
}

export async function fetchParadeEvents(): Promise<ParadeEvent[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select(
      'id, nombre, fecha_inicio, desfile_inicio, desfile_intervalo_min, desfile_separacion_m, desfile_atraso_min, recorrido_estado, recorrido_fuente_url',
    )
    .eq('tipo', 'llamadas')
    .order('fecha_inicio')
    .order('id')
  if (error) throw error
  return data
}

export type ParadeSchedule = Pick<
  ParadeEvent,
  'desfile_inicio' | 'desfile_intervalo_min' | 'desfile_separacion_m' | 'desfile_atraso_min'
>

/** El horario del desfile y su atraso (decisión 63). Lo vacío vale la regla general. */
export async function saveParadeSchedule(eventId: number, schedule: ParadeSchedule): Promise<void> {
  const { data, error } = await supabase
    .from('eventos')
    .update(schedule)
    .eq('id', eventId)
    .select('id')
  if (error) throw new Error(error.message, { cause: error })
  if (data.length === 0) throw new Error('No se guardó: el evento ya no existe o no hay permiso.')
}

export interface ParadeSlot {
  posicion: number
  conjunto_id: number
  conjunto_nombre: string
  fuente: string
}

export async function fetchParadeOrder(eventId: number): Promise<ParadeSlot[]> {
  const { data, error } = await supabase.rpc('orden_del_desfile', { p_evento_id: eventId })
  if (error) throw error
  return data
}

/** Reemplaza el orden de desfile entero, todo o nada. Una lista vacía lo borra. */
export async function replaceParadeOrder(
  eventId: number,
  groupIds: number[],
  fuente: string,
  fuenteUrl: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc('reemplazar_orden_desfile', {
    p_evento_id: eventId,
    p_conjuntos: groupIds,
    p_fuente: fuente,
    ...(fuenteUrl ? { p_fuente_url: fuenteUrl } : {}),
  })
  if (error) throw new Error(error.message, { cause: error })
  return data
}

export interface RouteCorner {
  calle: string
  cruce: string
  lat: number
  lng: number
}

export async function fetchParadeRoute(eventId: number): Promise<RouteCorner[]> {
  const { data, error } = await supabase.rpc('recorrido_del_desfile', { p_evento_id: eventId })
  if (error) throw error
  return data.map(({ calle, cruce, lat, lng }) => ({ calle, cruce, lat, lng }))
}

/** Reemplaza el recorrido entero, todo o nada, con su estado y su fuente. */
export async function replaceParadeRoute(
  eventId: number,
  corners: RouteCorner[],
  estado: EstadoEvento,
  fuentes: string[],
): Promise<number> {
  const { data, error } = await supabase.rpc('reemplazar_recorrido', {
    p_evento_id: eventId,
    p_esquinas: corners as unknown as Json,
    p_estado: estado,
    p_fuente_url: fuentes,
  })
  if (error) throw new Error(error.message, { cause: error })
  return data
}

export type TipoCorte = Enums<'tipo_corte'>

export interface Closure {
  id: number
  slug: string
  tipo: TipoCorte
  descripcion: string
  desde: string | null
  hasta: string | null
  estado: EstadoEvento
  fuente_url: string[]
  /** El tramo, como lista de puntos. Vacío si sólo se tiene la descripción. */
  puntos: { lat: number; lng: number }[]
}

export async function fetchClosures(eventId: number): Promise<Closure[]> {
  const { data, error } = await supabase.rpc('cortes_del_desfile', { p_evento_id: eventId })
  if (error) throw error
  return data.map(({ corte_id, puntos, ...row }) => ({
    ...row,
    id: corte_id,
    // La base los da como [longitud, latitud].
    puntos: ((puntos as [number, number][] | null) ?? []).map(([lng, lat]) => ({ lat, lng })),
  }))
}

export type ClosureFields = Omit<Closure, 'id'>

export async function saveClosure(
  eventId: number,
  id: number | null,
  fields: ClosureFields,
): Promise<void> {
  const { puntos, ...rest } = fields
  const row = {
    ...rest,
    evento_id: eventId,
    tramo:
      puntos.length >= 2
        ? `SRID=4326;LINESTRING(${puntos.map((p) => `${p.lng} ${p.lat}`).join(', ')})`
        : null,
  }
  const { data, error } = id
    ? await supabase.from('cortes_calle').update(row).eq('id', id).select('id')
    : await supabase.from('cortes_calle').insert(row).select('id')
  if (error) throw new Error(error.message, { cause: error })
  if (data.length === 0) throw new Error('No se guardó: el corte ya no existe o no hay permiso.')
}

export async function deleteClosure(id: number): Promise<void> {
  const { data, error } = await supabase.from('cortes_calle').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message, { cause: error })
  if (data.length === 0) throw new Error('No se borró: el corte ya no existe o no hay permiso.')
}

// ---------------------------------------------------------------- registro de cambios

export interface LogEntry {
  id: number
  tabla: string
  fila: string
  operacion: 'alta' | 'cambio' | 'baja'
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  usuario_email: string | null
  hecho_en: string
}

export interface LogFilter {
  tabla?: string
  /** Sólo lo de una noche (actuaciones y suspensiones). */
  noche?: string
  /** Parte del email de quien hizo el cambio. */
  email?: string
  /** Para seguir: sólo lo anterior a este id. */
  beforeId?: number
}

export const LOG_PAGE_SIZE = 50

/** El registro de cambios (decisión 73), de lo más nuevo a lo más viejo, de a una página. */
export async function fetchChangeLog(filter: LogFilter): Promise<LogEntry[]> {
  let query = supabase
    .from('registro_cambios')
    .select('id, tabla, fila, operacion, antes, despues, usuario_email, hecho_en')
    .order('id', { ascending: false })
    .limit(LOG_PAGE_SIZE)
  if (filter.tabla) query = query.eq('tabla', filter.tabla)
  if (filter.noche)
    query = query.or(`despues->>noche.eq.${filter.noche},antes->>noche.eq.${filter.noche}`)
  if (filter.email)
    query = query.ilike('usuario_email', `%${filter.email.replace(/[%_,()]/g, '')}%`)
  if (filter.beforeId) query = query.lt('id', filter.beforeId)
  const { data, error } = await query
  if (error) throw error
  return data as LogEntry[]
}
