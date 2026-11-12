import { norm } from '@cuerda/shared'
import type { Group, StageEntry } from '../../lib/api'

export interface SearchResults {
  groups: Group[]
  stages: StageEntry[]
}

const NOTHING: SearchResults = { groups: [], stages: [] }

/** Los que tienen el texto en el nombre o en un alias; primero los que empiezan con él. */
function matching<T extends { claves: string[] }>(items: T[], wanted: string): T[] {
  const starts: T[] = []
  const contains: T[] = []
  for (const item of items) {
    if (item.claves.some((key) => key.startsWith(wanted))) starts.push(item)
    else if (item.claves.some((key) => key.includes(wanted))) contains.push(item)
  }
  return [...starts, ...contains]
}

/**
 * La búsqueda de la app: conjuntos y escenarios por nombre o por alias, comparando con `norm`
 * (sin tildes ni mayúsculas) y sin tolerancia a errores de tipeo, igual que la lista de
 * conjuntos. Sin texto no devuelve nada.
 */
export function searchAll(text: string, groups: Group[], stages: StageEntry[]): SearchResults {
  const wanted = norm(text)
  if (wanted === '') return NOTHING
  return { groups: matching(groups, wanted), stages: matching(stages, wanted) }
}
