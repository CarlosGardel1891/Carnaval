import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export const repoPath = (...parts: string[]): string => path.join(repoRoot, ...parts)

export type CsvRow = Record<string, string>

/** CSV con comillas dobles (RFC 4180), como los de research/. Todo llega como texto. */
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text // sin BOM
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!
    if (quoted) {
      if (ch !== '"') field += ch
      else if (src[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = false
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') field += ch
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  const [header = [], ...body] = rows
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

/** Un CSV semilla de research/. */
export const readResearchCsv = (file: string): CsvRow[] =>
  parseCsv(readFileSync(repoPath('research', file), 'utf8'))
