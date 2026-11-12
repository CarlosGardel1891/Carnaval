import { norm } from '@cuerda/shared'
import type { CatalogGroup } from '../../lib/api'

export interface OrderLine {
  /** El nombre tal como se escribió, sin el número de adelante. */
  name: string
  /** El conjunto que coincide exacto, por nombre o alias normalizados (decisión 5). */
  group: CatalogGroup | null
  /** Si ese conjunto ya apareció más arriba en la lista. */
  repeated: boolean
}

// «1. Nombre», «1 - Nombre», «1) Nombre», «1º Nombre»: el número de adelante no cuenta, manda
// el orden de las líneas.
const POSITION = /^\s*\d+\s*[.)º°:-]?\s+/

/** Lee un orden de desfile pegado, una comparsa por línea, y reconoce cada nombre. */
export function readOrder(text: string, groups: CatalogGroup[]): OrderLine[] {
  const byName = new Map<string, CatalogGroup>()
  for (const group of groups) {
    for (const name of [group.nombre, ...group.alias]) byName.set(norm(name), group)
  }
  const seen = new Set<number>()
  return text
    .split('\n')
    .map((line) => line.replace(POSITION, '').trim())
    .filter(Boolean)
    .map((name) => {
      const group = byName.get(norm(name)) ?? null
      const repeated = group !== null && seen.has(group.id)
      if (group) seen.add(group.id)
      return { name, group, repeated }
    })
}
