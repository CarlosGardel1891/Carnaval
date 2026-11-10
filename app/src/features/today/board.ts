import { Constants, type CategoriaConjunto, type TipoEscenario } from '@cuerda/shared'
import type { Act } from '../../lib/api'

/** Lógica del pizarrón, sin React: agrupar, ordenar, filtrar y «ahora en escena». */

/** Tope de «ahora en escena» si no hay una actuación siguiente que lo corte antes. */
export const ON_STAGE_MAX_MS = 75 * 60_000

export interface StageGroup {
  escenario_id: number
  slug: string
  nombre: string
  tipo: TipoEscenario | null
  barrio: string | null
  gratis: boolean | null
  precio_texto: string | null
  itinerante: boolean
  /** Dirección del escenario fijo; en un itinerante cada actuación lleva la suya. */
  direccion: string | null
  /** Distancia a la parada más cercana de la noche, si se pidió con ubicación. */
  distancia_m: number | null
  hasLocation: boolean
  acts: Act[]
}

export const hasLocation = (act: Act): boolean => act.lat !== null && act.lng !== null

const byStart = (a: Act, b: Act) =>
  Date.parse(a.inicio) - Date.parse(b.inicio) || a.actuacion_id - b.actuacion_id

/** Las actuaciones por escenario, cada grupo ordenado por hora. */
export function groupByStage(acts: Act[]): StageGroup[] {
  const groups = new Map<number, StageGroup>()
  for (const act of [...acts].sort(byStart)) {
    let group = groups.get(act.escenario_id)
    if (!group) {
      group = {
        escenario_id: act.escenario_id,
        slug: act.escenario_slug,
        nombre: act.escenario_nombre,
        tipo: act.escenario_tipo,
        barrio: act.escenario_barrio,
        gratis: act.gratis,
        precio_texto: act.precio_texto,
        itinerante: act.itinerante === true,
        direccion: act.itinerante === true ? null : act.direccion,
        distancia_m: null,
        hasLocation: false,
        acts: [],
      }
      groups.set(act.escenario_id, group)
    }
    group.acts.push(act)
    if (hasLocation(act)) group.hasLocation = true
    if (act.distancia_m !== null) {
      group.distancia_m =
        group.distancia_m === null ? act.distancia_m : Math.min(group.distancia_m, act.distancia_m)
    }
  }
  return [...groups.values()]
}

const byName = (a: StageGroup, b: StageGroup) => a.nombre.localeCompare(b.nombre, 'es')

/** Primero el escenario que arranca antes; a igual hora, por nombre. */
export function sortByFirstStart(groups: StageGroup[]): StageGroup[] {
  const firstStart = (g: StageGroup) => {
    const first = g.acts.find((a) => a.estado !== 'suspendida') ?? g.acts[0]
    return first ? Date.parse(first.inicio) : Infinity
  }
  return [...groups].sort((a, b) => firstStart(a) - firstStart(b) || byName(a, b))
}

/** Primero el más cercano; los que no tienen distancia, al final. */
export function sortByDistance(groups: StageGroup[]): StageGroup[] {
  const distance = (g: StageGroup) => g.distancia_m ?? Infinity
  return [...groups].sort((a, b) => {
    const da = distance(a)
    const db = distance(b)
    return da === db ? byName(a, b) : da - db
  })
}

/**
 * Qué actuaciones están «ahora en escena»: cada una desde que empieza hasta que empieza
 * la siguiente no suspendida de su escenario, con un tope de 75 minutos. Una suspendida
 * nunca está en escena ni corta a la anterior.
 */
export function onStageNow(acts: Act[], now: Date): Set<number> {
  const t = now.getTime()
  const onStage = new Set<number>()
  for (const group of groupByStage(acts)) {
    const live = group.acts.filter((a) => a.estado !== 'suspendida')
    live.forEach((act, i) => {
      const start = Date.parse(act.inicio)
      const next = live[i + 1]
      const end = Math.min(start + ON_STAGE_MAX_MS, next ? Date.parse(next.inicio) : Infinity)
      if (t >= start && t < end) onStage.add(act.actuacion_id)
    })
  }
  return onStage
}

/** Las categorías que aparecen esa noche, en el orden del enum de la base. */
export function categoriesPresent(acts: Act[]): CategoriaConjunto[] {
  const present = new Set(acts.map((a) => a.conjunto_categoria))
  return Constants.public.Enums.categoria_conjunto.filter((c) => present.has(c))
}

/** Sin categorías elegidas no se filtra. */
export function filterByCategories(acts: Act[], categories: readonly CategoriaConjunto[]): Act[] {
  if (categories.length === 0) return acts
  return acts.filter((a) => categories.includes(a.conjunto_categoria))
}

/** Sólo las actuaciones de los escenarios que esa noche tienen ubicación (para «cerca mío»). */
export function onlyLocatedStages(acts: Act[]): Act[] {
  const located = new Set(acts.filter(hasLocation).map((a) => a.escenario_id))
  return acts.filter((a) => located.has(a.escenario_id))
}

/** Cuántos escenarios de la lista no tienen ubicación cargada. */
export function countStagesWithoutLocation(acts: Act[]): number {
  return groupByStage(acts).filter((g) => !g.hasLocation).length
}
