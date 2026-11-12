// Lo que decide el admin sobre una cartelera leída, y cómo eso se convierte en el pedido que
// va a la base (decisión 71). Funciones puras.
import { norm, type CategoriaConjunto, type TipoEscenario } from '@cuerda/shared'
import type { GridRow, NewGroup, NewStage, PreviewRow, PublishRequest } from '../../lib/api'
import type { ParsedLine } from './parser'

/** Qué hacer con un nombre de la cartelera que no coincide con nada. */
export type Choice =
  /** Es uno que ya existe. `saveAlias`: además, guardar el nombre de la cartelera como alias. */
  | { kind: 'existing'; id: number | null; saveAlias: boolean }
  | { kind: 'newGroup'; nombre: string; categoria: CategoriaConjunto }
  | { kind: 'newStage'; nombre: string; tipo: TipoEscenario; itinerante: boolean }

export interface Decisions {
  /** Por nombre de escenario normalizado. */
  stages: Record<string, Choice>
  /** Por nombre de conjunto normalizado. */
  groups: Record<string, Choice>
  /** La parada de esa noche, por nombre de escenario normalizado. */
  stops: Record<string, string>
  /** Líneas que el admin dejó afuera, por su `n`. */
  excluded: number[]
}

export const emptyDecisions: Decisions = { stages: {}, groups: {}, stops: {}, excluded: [] }

export const nameKey = (name: string) => norm(name)
const newStageKey = (key: string) => `e:${key}`
const newGroupKey = (key: string) => `c:${key}`

export const stopOf = (line: ParsedLine, decisions: Decisions): string =>
  decisions.stops[nameKey(line.escenario)] ?? line.direccion ?? ''

/** Las líneas que se mandan a la base, con lo que el admin ya resolvió. */
export function toRows(lines: ParsedLine[], decisions: Decisions): GridRow[] {
  const excluded = new Set(decisions.excluded)
  return lines
    .filter((line) => !excluded.has(line.n))
    .map((line) => {
      const row: GridRow = {
        n: line.n,
        escenario: line.escenario,
        conjunto: line.conjunto,
        hora: line.hora,
      }
      const stop = stopOf(line, decisions).trim()
      if (stop) row.direccion = stop

      const stage = decisions.stages[nameKey(line.escenario)]
      if (stage?.kind === 'existing' && stage.id !== null) row.escenario_id = stage.id
      if (stage?.kind === 'newStage') row.escenario_nuevo = newStageKey(nameKey(line.escenario))

      const group = decisions.groups[nameKey(line.conjunto)]
      if (group?.kind === 'existing' && group.id !== null) row.conjunto_id = group.id
      if (group?.kind === 'newGroup') row.conjunto_nuevo = newGroupKey(nameKey(line.conjunto))
      return row
    })
}

export type LineStatus = 'nueva' | 'cambia' | 'igual' | 'sin_coincidencia' | 'duplicada'

export interface ReviewedLine {
  line: ParsedLine
  row: GridRow
  preview: PreviewRow | undefined
  status: LineStatus
  /** Nombre con el que queda el escenario: el del catálogo o el del que se va a crear. */
  stageName: string | null
  groupName: string | null
  stageMissing: boolean
  groupMissing: boolean
  /** Si el escenario es itinerante: lleva la parada en la actuación. */
  itinerant: boolean
}

/**
 * Junta cada línea con lo que dijo la base. La base no conoce lo que todavía no existe: una
 * línea con un conjunto o un escenario por crear es nueva, y los repetidos entre esas se
 * detectan acá.
 */
export function review(
  lines: ParsedLine[],
  decisions: Decisions,
  preview: PreviewRow[] | undefined,
): ReviewedLine[] {
  const byN = new Map((preview ?? []).map((row) => [row.n, row]))
  const partial = toRows(lines, decisions).map((row) => {
    const line = lines.find((l) => l.n === row.n)!
    const found = byN.get(row.n)
    const stage = decisions.stages[nameKey(line.escenario)]
    const group = decisions.groups[nameKey(line.conjunto)]
    const stageRef = row.escenario_nuevo ?? found?.escenario_id ?? null
    const groupRef = row.conjunto_nuevo ?? found?.conjunto_id ?? null
    return {
      line,
      row,
      preview: found,
      stageRef,
      groupRef,
      stageName: stage?.kind === 'newStage' ? stage.nombre : (found?.escenario_nombre ?? null),
      groupName: group?.kind === 'newGroup' ? group.nombre : (found?.conjunto_nombre ?? null),
      itinerant:
        stage?.kind === 'newStage' ? stage.itinerante : (found?.escenario_itinerante ?? false),
    }
  })

  const seen = new Map<string, number>()
  for (const item of partial) {
    if (item.stageRef === null || item.groupRef === null) continue
    const key = `${item.stageRef}|${item.groupRef}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }

  return partial.map(({ stageRef, groupRef, ...item }) => {
    const stageMissing = stageRef === null
    const groupMissing = groupRef === null
    let status: LineStatus
    if (stageMissing || groupMissing) status = 'sin_coincidencia'
    else if ((seen.get(`${stageRef}|${groupRef}`) ?? 0) > 1) status = 'duplicada'
    else if (item.row.escenario_nuevo || item.row.conjunto_nuevo) status = 'nueva'
    else status = (item.preview?.estado as LineStatus | undefined) ?? 'sin_coincidencia'
    return { ...item, status, stageMissing, groupMissing }
  })
}

export interface Unmatched {
  key: string
  /** El nombre tal como vino en la cartelera (la primera vez). */
  name: string
  lines: number
}

/** Los nombres que la base no reconoció, cada uno una vez, con cuántas líneas lo usan. */
export function unmatched(
  lines: ParsedLine[],
  decisions: Decisions,
  preview: PreviewRow[] | undefined,
): { stages: Unmatched[]; groups: Unmatched[] } {
  if (!preview) return { stages: [], groups: [] }
  const excluded = new Set(decisions.excluded)
  const byN = new Map(preview.map((row) => [row.n, row]))
  const stages = new Map<string, Unmatched>()
  const groups = new Map<string, Unmatched>()
  const count = (map: Map<string, Unmatched>, name: string) => {
    const key = nameKey(name)
    const item = map.get(key) ?? { key, name, lines: 0 }
    item.lines += 1
    map.set(key, item)
  }
  for (const line of lines) {
    if (excluded.has(line.n)) continue
    const found = byN.get(line.n)
    // Sigue en la lista mientras el admin lo esté resolviendo, aunque ya haya elegido.
    if (!found?.escenario_id || decisions.stages[nameKey(line.escenario)]) {
      count(stages, line.escenario)
    }
    if (!found?.conjunto_id || decisions.groups[nameKey(line.conjunto)]) {
      count(groups, line.conjunto)
    }
  }
  return { stages: [...stages.values()], groups: [...groups.values()] }
}

/** El pedido de publicación: las líneas, los alias a guardar y lo que hay que crear. */
export function toPublishRequest(
  lines: ParsedLine[],
  decisions: Decisions,
  meta: Pick<PublishRequest, 'noche' | 'fuente' | 'fuenteUrl' | 'leftovers'>,
): PublishRequest {
  const rows = toRows(lines, decisions)
  const used = {
    stages: new Map(lines.map((line) => [nameKey(line.escenario), line.escenario])),
    groups: new Map(lines.map((line) => [nameKey(line.conjunto), line.conjunto])),
  }
  const inRows = {
    stages: new Set(rows.map((row) => nameKey(row.escenario))),
    groups: new Set(rows.map((row) => nameKey(row.conjunto))),
  }

  const aliases: PublishRequest['aliases'] = []
  const groups: NewGroup[] = []
  const stages: NewStage[] = []

  for (const [key, choice] of Object.entries(decisions.stages)) {
    if (!inRows.stages.has(key)) continue
    if (choice.kind === 'existing' && choice.id !== null && choice.saveAlias) {
      aliases.push({ tipo: 'escenario', id: choice.id, alias: used.stages.get(key)! })
    }
    if (choice.kind === 'newStage') {
      stages.push({
        clave: newStageKey(key),
        nombre: choice.nombre.trim(),
        tipo: choice.tipo,
        itinerante: choice.itinerante,
      })
    }
  }
  for (const [key, choice] of Object.entries(decisions.groups)) {
    if (!inRows.groups.has(key)) continue
    if (choice.kind === 'existing' && choice.id !== null && choice.saveAlias) {
      aliases.push({ tipo: 'conjunto', id: choice.id, alias: used.groups.get(key)! })
    }
    if (choice.kind === 'newGroup') {
      groups.push({
        clave: newGroupKey(key),
        nombre: choice.nombre.trim(),
        categoria: choice.categoria,
      })
    }
  }

  return { ...meta, rows, aliases, created: { conjuntos: groups, escenarios: stages } }
}

/** Para proponer el tipo de un escenario nuevo según si el título traía una parada. */
export const defaultNewStage = (name: string, hasStop: boolean): Choice => ({
  kind: 'newStage',
  nombre: name,
  tipo: hasStop ? 'gratuito' : 'popular',
  itinerante: hasStop,
})
