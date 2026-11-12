import type { Act, Coords, FixtureRow, Group, ParadeSlot, UpcomingAct } from '../lib/api'
import fixtureData from './data/fixture.json'
import nightData from './data/night.json'
import orderData from './data/order.json'

/**
 * Modo demostración (decisión 85). Fuera de temporada no hay grilla, y sin nada que mirar los
 * testers de la beta no usan la app. El build `beta` trae empaquetados una noche de ejemplo (la
 * cartelera real del 28/02/2026, corrida a la noche de hoy), un orden de desfile y un fixture
 * del Concurso de ejemplo; se muestran sólo donde el proyecto remoto todavía no tiene nada.
 *
 * Este módulo y sus datos sólo se cargan con `VITE_DEMO=1`: el build `produccion` no los
 * contiene (`app/src/build.test.ts` lo controla). Los datos traen slugs, nunca ids: cada
 * conjunto y cada escenario se resuelve contra el catálogo real, y lo que no está ahí no se
 * muestra. Para regenerarlos: `pnpm gen:demo`.
 */

/** Una cadena que sólo existe acá: el test del build la busca en lo que se publica. */
export const DEMO_MARKER = 'carnavalero-modo-demostracion'

/** La noche lógica de la cartelera de ejemplo. */
export const DEMO_NIGHT = '2026-02-28'

/** Las fuentes con las que la app ya reconoce un orden y un fixture de prueba. */
const SAMPLE_ORDER_SOURCE = 'orden-ficticio'
const SAMPLE_FIXTURE_SOURCE = 'fixture-ficticio'

const DAY_MS = 24 * 60 * 60_000

/** Lo que hace falta de un escenario del catálogo para armar una actuación. */
export interface DemoStage {
  id: number
  slug: string
  nombre: string
  tipo: Act['escenario_tipo']
  barrio: string | null
  direccion: string | null
  gratis: boolean | null
  precio_texto: string | null
  itinerante: boolean | null
}

/** El catálogo real, contra el que se resuelven los slugs de los datos de ejemplo. */
export interface DemoCatalog {
  groups: Group[]
  stages: DemoStage[]
  /** El punto de los escenarios que lo tienen cargado, por id. */
  coords: Map<number, Coords>
}

export interface DemoNightFilters {
  onlyFree?: boolean
  /** Con «mis conjuntos»: sólo los de `followed`. */
  onlyFollowed?: boolean
}

/** Días enteros entre dos fechas puras (`YYYY-MM-DD`). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

/** Un instante corrido esa cantidad de días. Uruguay no cambia la hora: el reloj no se mueve. */
const shift = (instant: string, days: number): string =>
  new Date(Date.parse(instant) + days * DAY_MS).toISOString()

/**
 * La noche de ejemplo puesta en `noche`: las mismas actuaciones, a las mismas horas (las de
 * pasada la medianoche siguen siendo de esa noche). Los ids de las actuaciones son negativos,
 * para que no se confundan con los de la base.
 */
export function buildDemoNight(
  noche: string,
  catalog: DemoCatalog,
  followed: ReadonlySet<number>,
  filters: DemoNightFilters = {},
): Act[] {
  const groups = new Map(catalog.groups.map((group) => [group.slug, group]))
  const stages = new Map(catalog.stages.map((stage) => [stage.slug, stage]))
  const days = daysBetween(DEMO_NIGHT, noche)

  const acts: Act[] = []
  nightData.forEach((row, index) => {
    const group = groups.get(row.conjunto_slug)
    const stage = stages.get(row.escenario_slug)
    if (!group || !stage) return
    const isFollowed = followed.has(group.id)
    if (filters.onlyFree && stage.gratis !== true) return
    if (filters.onlyFollowed && !isFollowed) return
    // Un itinerante no tiene un punto propio: el del escenario no vale para su parada.
    const point = stage.itinerante ? undefined : catalog.coords.get(stage.id)
    acts.push({
      actuacion_id: -(index + 1),
      inicio: shift(row.inicio, days),
      estado: row.estado as Act['estado'],
      etapa_rueda: row.etapa_rueda as Act['etapa_rueda'],
      etapa_numero: row.etapa_numero,
      conjunto_id: group.id,
      conjunto_slug: group.slug,
      conjunto_nombre: group.nombre,
      conjunto_categoria: group.categoria,
      conjunto_foto_url: group.foto_url,
      escenario_id: stage.id,
      escenario_slug: stage.slug,
      escenario_nombre: stage.nombre,
      escenario_tipo: stage.tipo,
      escenario_barrio: stage.barrio,
      direccion: row.direccion ?? stage.direccion,
      gratis: stage.gratis,
      precio_texto: stage.precio_texto,
      itinerante: stage.itinerante,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      es_favorito: isFollowed,
      distancia_m: null,
    })
  })
  return acts
}

/** Lo que le queda a un conjunto en la noche de ejemplo, con la forma de `proximas_de_conjunto`. */
export function buildDemoUpcoming(
  groupId: number,
  noche: string,
  catalog: DemoCatalog,
): UpcomingAct[] {
  return buildDemoNight(noche, catalog, new Set())
    .filter((act) => act.conjunto_id === groupId)
    .map((act) => ({
      actuacion_id: act.actuacion_id,
      noche,
      inicio: act.inicio,
      estado: act.estado,
      etapa_rueda: act.etapa_rueda,
      etapa_numero: act.etapa_numero,
      escenario_id: act.escenario_id,
      escenario_slug: act.escenario_slug,
      escenario_nombre: act.escenario_nombre,
      escenario_tipo: act.escenario_tipo,
      escenario_barrio: act.escenario_barrio,
      direccion: act.direccion,
      gratis: act.gratis,
      precio_texto: act.precio_texto,
      itinerante: act.itinerante,
      lat: act.lat,
      lng: act.lng,
    }))
}

/** El orden de desfile de ejemplo de una noche de Llamadas, por el slug de su evento. */
export function buildDemoOrder(eventSlug: string, groups: Group[]): ParadeSlot[] {
  const bySlug = new Map(groups.map((group) => [group.slug, group]))
  const slots: ParadeSlot[] = []
  for (const row of orderData) {
    if (row.evento_slug !== eventSlug) continue
    const group = bySlug.get(row.conjunto_slug)
    if (!group) continue
    slots.push({
      posicion: row.posicion,
      conjunto_id: group.id,
      conjunto_slug: group.slug,
      conjunto_nombre: group.nombre,
      conjunto_barrio: group.barrio,
      fuente: SAMPLE_ORDER_SOURCE,
    })
  }
  return slots
}

/** El fixture de ejemplo del Concurso. Las etapas llevan ids negativos. */
export function buildDemoFixture(groups: Group[]): FixtureRow[] {
  const bySlug = new Map(groups.map((group) => [group.slug, group]))
  const stageIds = new Map<string, number>()
  const rows: FixtureRow[] = []
  fixtureData.forEach((row, index) => {
    const group = bySlug.get(row.conjunto_slug)
    if (!group) return
    const stageKey = `${row.rueda}-${row.numero}`
    if (!stageIds.has(stageKey)) stageIds.set(stageKey, -(stageIds.size + 1))
    rows.push({
      etapa_id: stageIds.get(stageKey)!,
      rueda: row.rueda as FixtureRow['rueda'],
      numero: row.numero,
      fecha: row.fecha,
      fuente: SAMPLE_FIXTURE_SOURCE,
      actuacion_id: -(index + 1),
      inicio: row.inicio,
      estado: row.estado as FixtureRow['estado'],
      conjunto_id: group.id,
      conjunto_slug: group.slug,
      conjunto_nombre: group.nombre,
      conjunto_categoria: group.categoria,
    })
  })
  return rows
}
