// Todo lo que habla con Supabase desde el panel. Los tests de pantallas lo reemplazan con
// `vi.mock('…/lib/api')`, que toma el doble de `__mocks__/api.ts`: al agregar una función
// acá hay que sumarla ahí.
import type { CategoriaConjunto, EstadoActuacion, Json, TipoEscenario } from '@cuerda/shared'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

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
  anio: number
  fecha_inicio: string
  fecha_fin: string
}

export async function fetchSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from('temporadas')
    .select('anio, fecha_inicio, fecha_fin')
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
