import type { LogEntry } from '../../lib/api'

// Columnas que se calculan solas a partir de otras: no dicen nada nuevo en el registro.
const DERIVED = new Set(['nombre_norm', 'alias_norm', 'noche', 'creado_en'])
const MAX_VALUE = 120

export interface FieldChange {
  field: string
  before: string
  after: string
}

/** Un valor del registro, como texto corto. */
export function showValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE)}…` : text
}

/** Qué campos cambiaron en un cambio, con su valor de antes y de después. */
export function changedFields(entry: LogEntry): FieldChange[] {
  if (entry.operacion !== 'cambio' || !entry.antes || !entry.despues) return []
  const fields = new Set([...Object.keys(entry.antes), ...Object.keys(entry.despues)])
  return [...fields]
    .filter((field) => !DERIVED.has(field))
    .filter(
      (field) => JSON.stringify(entry.antes![field]) !== JSON.stringify(entry.despues![field]),
    )
    .sort()
    .map((field) => ({
      field,
      before: showValue(entry.antes![field]),
      after: showValue(entry.despues![field]),
    }))
}

/** Con qué se reconoce la fila: su nombre o su slug si los tiene; si no, su clave. */
export function rowLabel(entry: LogEntry): string {
  const row = entry.despues ?? entry.antes ?? {}
  for (const field of ['nombre', 'slug', 'descripcion']) {
    const value = row[field]
    if (typeof value === 'string' && value) return value
  }
  return `#${entry.fila}`
}
