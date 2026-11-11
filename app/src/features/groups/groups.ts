import { norm, type CategoriaConjunto } from '@cuerda/shared'
import type { Group, GroupSeason } from '../../lib/api'

/** La participación del conjunto en esa temporada, o null si no tiene. */
export function seasonOf(group: Group, seasonId: number | null): GroupSeason | null {
  if (seasonId === null) return null
  return group.temporadas.find((season) => season.temporada_id === seasonId) ?? null
}

export interface GroupListOptions {
  /** Lo que se escribió en el buscador, tal cual. */
  text: string
  categories: CategoriaConjunto[]
  /** La temporada vigente; null si no se sabe (entonces se lista todo el catálogo). */
  seasonId: number | null
}

/**
 * Los conjuntos que se muestran, en el orden en que llegaron.
 *
 * - Sin texto: los que participan de la temporada vigente (decisión 43).
 * - Con texto: todo el catálogo, los que tienen ese texto dentro del nombre o de un alias,
 *   comparando con `norm` (sin tildes ni mayúsculas) y sin tolerancia a errores de tipeo.
 */
export function listGroups(groups: Group[], options: GroupListOptions): Group[] {
  const { text, categories, seasonId } = options
  const wanted = norm(text)
  return groups.filter((group) => {
    if (categories.length > 0 && !categories.includes(group.categoria)) return false
    if (wanted !== '') return group.claves.some((key) => key.includes(wanted))
    return seasonId === null || seasonOf(group, seasonId) !== null
  })
}

/** Las categorías que tienen algún conjunto, para ofrecer sólo esos filtros. */
export function groupCategories(groups: Group[]): Set<CategoriaConjunto> {
  return new Set(groups.map((group) => group.categoria))
}
