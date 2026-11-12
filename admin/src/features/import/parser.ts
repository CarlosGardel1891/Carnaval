// Lee una cartelera pegada o un CSV y devuelve sus líneas: escenario, hora y conjunto
// (decisión 71). Función pura: no reconoce nombres (eso lo hace la base, con `public.norm`) y
// no descarta en silencio lo que no entiende: lo devuelve en `unread`.
import { norm } from '@cuerda/shared'

export interface ParsedLine {
  /** Orden en la cartelera, desde 1. */
  n: number
  /** El nombre del escenario tal como vino. */
  escenario: string
  /** La parada de esa noche, si el título la trae («… - ENTRADA GRATUITA - DIRECCIÓN»). */
  direccion: string | null
  /** «HH:MM», hora de Montevideo. */
  hora: string
  /** El nombre del conjunto tal como vino. */
  conjunto: string
  /** El número de línea en el texto pegado, desde 1. */
  sourceLine: number
}

export type UnreadReason =
  /** Una línea con hora antes de cualquier nombre de escenario. */
  | 'noStage'
  /** Un título sin ninguna actuación debajo (o un texto suelto). */
  | 'noActs'
  /** Una hora que no existe, como 25:00. */
  | 'badTime'
  /** Una hora sin conjunto al lado. */
  | 'noGroup'
  /** Una fila de tabla o de CSV a la que le falta un dato. */
  | 'incomplete'

export interface UnreadLine {
  sourceLine: number
  text: string
  reason: UnreadReason
}

export interface ParseResult {
  format: 'cartelera' | 'tabla' | 'csv'
  lines: ParsedLine[]
  unread: UnreadLine[]
  /** Las fechas (YYYY-MM-DD) que trae una tabla, para avisar si no son la noche elegida. */
  dates: string[]
}

// «20:00», «20.00», «20h00», «20:00 hs.», y después un separador opcional.
const TIME_LINE =
  /^(\d{1,2})\s?[:.h]\s?(\d{2})\s*(?:hs?\.?|horas)?(?=$|[\s\-–—:·|])\s*[-–—:·|]?\s*(.*)$/i
const TIME_CELL = /^(\d{1,2})\s?[:.h]\s?(\d{2})\s*(?:hs?\.?|horas)?$/i
const BULLET = /^[•*·▪■►>]+\s*/
// «NOMBRE - ENTRADA GRATUITA - DIRECCIÓN»: sólo ahí un guion separa algo. «ARBOLITO - EL
// TEJANO» es un nombre entero.
const FREE_ENTRY = /\s+[-–—]\s+ENTRADA\s+(?:GRATUITA|LIBRE|GRATIS)\s*(?:[-–—]\s*(.*))?$/i

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

function toTime(hours: string, minutes: string): string | null {
  const h = Number(hours)
  const m = Number(minutes)
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function splitTitle(title: string): { escenario: string; direccion: string | null } {
  const match = FREE_ENTRY.exec(title)
  if (!match) return { escenario: title, direccion: null }
  return {
    escenario: clean(title.slice(0, match.index)),
    direccion: clean(match[1] ?? '') || null,
  }
}

function toIsoDate(cell: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cell)
  if (iso) return cell
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(cell)
  if (!local) return null
  return `${local[3]}-${local[2]!.padStart(2, '0')}-${local[1]!.padStart(2, '0')}`
}

class Collector {
  readonly lines: ParsedLine[] = []
  readonly unread: UnreadLine[] = []
  readonly dates = new Set<string>()

  add(line: Omit<ParsedLine, 'n'>) {
    this.lines.push({ n: this.lines.length + 1, ...line })
  }

  skip(sourceLine: number, text: string, reason: UnreadReason) {
    this.unread.push({ sourceLine, text, reason })
  }

  result(format: ParseResult['format']): ParseResult {
    this.unread.sort((a, b) => a.sourceLine - b.sourceLine)
    return { format, lines: this.lines, unread: this.unread, dates: [...this.dates].sort() }
  }
}

/** El nombre del escenario y, debajo, una línea por actuación: «20:00 - CABALLEROS». */
function parsePoster(rows: string[]): ParseResult {
  const out = new Collector()
  let stage: { title: string; sourceLine: number; acts: number } | null = null
  const closeStage = () => {
    if (stage && stage.acts === 0) out.skip(stage.sourceLine, stage.title, 'noActs')
  }

  rows.forEach((raw, index) => {
    const sourceLine = index + 1
    const text = clean(raw).replace(BULLET, '')
    if (!text) return

    const match = TIME_LINE.exec(text)
    if (!match) {
      closeStage()
      stage = { title: text, sourceLine, acts: 0 }
      return
    }
    const hora = toTime(match[1]!, match[2]!)
    const conjunto = clean(match[3] ?? '')
    if (!hora) return out.skip(sourceLine, text, 'badTime')
    if (!conjunto) return out.skip(sourceLine, text, 'noGroup')
    if (!stage) return out.skip(sourceLine, text, 'noStage')
    stage.acts += 1
    out.add({ ...splitTitle(stage.title), hora, conjunto, sourceLine })
  })
  closeStage()
  return out.result('cartelera')
}

type Column = 'fecha' | 'hora' | 'conjunto' | 'escenario' | 'direccion'

const HEADERS: Record<string, Column> = {
  fecha: 'fecha',
  dia: 'fecha',
  hora: 'hora',
  horario: 'hora',
  conjunto: 'conjunto',
  agrupacion: 'conjunto',
  escenario: 'escenario',
  tablado: 'escenario',
  direccion: 'direccion',
  parada: 'direccion',
}

function readHeader(cells: string[]): Column[] | null {
  const columns = cells.map((cell) => HEADERS[norm(cell)])
  if (columns.some((column) => !column)) return null
  const found = columns as Column[]
  for (const needed of ['hora', 'conjunto', 'escenario'] as const) {
    if (!found.includes(needed)) return null
  }
  return found
}

/** Una fila por actuación. `columns` es el orden de las celdas; null = hay que deducirlo. */
function readRow(
  out: Collector,
  cells: string[],
  columns: Column[] | null,
  sourceLine: number,
  text: string,
) {
  const row: Partial<Record<Column, string>> = {}
  if (columns) {
    columns.forEach((column, i) => {
      row[column] = clean(cells[i] ?? '')
    })
  } else {
    // Sin encabezado: la fecha y la hora se reconocen por su forma; de lo que queda, primero
    // el conjunto y después el escenario, como en la tabla de DAECPU.
    const rest: string[] = []
    for (const cell of cells.map(clean)) {
      if (!cell) continue
      if (!row.hora && TIME_CELL.test(cell)) row.hora = cell
      else if (!row.fecha && toIsoDate(cell)) row.fecha = cell
      else rest.push(cell)
    }
    ;[row.conjunto, row.escenario, row.direccion] = rest
  }

  const date = row.fecha ? toIsoDate(row.fecha) : null
  if (date) out.dates.add(date)

  const time = TIME_CELL.exec(row.hora ?? '')
  if (!time || !row.conjunto || !row.escenario) return out.skip(sourceLine, text, 'incomplete')
  const hora = toTime(time[1]!, time[2]!)
  if (!hora) return out.skip(sourceLine, text, 'badTime')

  const title = splitTitle(row.escenario)
  out.add({
    escenario: title.escenario,
    direccion: row.direccion || title.direccion,
    hora,
    conjunto: row.conjunto,
    sourceLine,
  })
}

/** Una tabla copiada: una fila por actuación, con las celdas separadas por tabulaciones. */
function parseTable(rows: string[]): ParseResult {
  const out = new Collector()
  let columns: Column[] | null = null
  let first = true
  rows.forEach((raw, index) => {
    if (!raw.trim()) return
    const cells = raw.split('\t')
    if (first) {
      first = false
      columns = readHeader(cells)
      if (columns) return
    }
    readRow(out, cells, columns, index + 1, clean(raw))
  })
  return out.result('tabla')
}

/**
 * Lee el texto pegado de una cartelera. Si la mayoría de las líneas trae tabulaciones es una
 * tabla copiada (una fila por actuación); si no, la cartelera de la prensa.
 */
export function parseGridText(text: string): ParseResult {
  const rows = text.replace(/\r\n?/g, '\n').split('\n')
  const filled = rows.filter((row) => row.trim())
  const tabbed = filled.filter((row) => row.includes('\t'))
  return tabbed.length * 2 > filled.length ? parseTable(rows) : parsePoster(rows)
}

export const CSV_TEMPLATE = [
  'escenario,hora,conjunto,direccion',
  'Velódromo Municipal,20:00,Falta y Resto,',
  'Escenario Móvil IM 1,20:50,Los Muchachos,"Plaza Bob Marley, Ingavi y Canstatt"',
  '',
].join('\n')

/** Las filas de un CSV (RFC 4180), con sus celdas y la línea donde empieza cada una. */
function csvRows(text: string, separator: string): { cells: string[]; sourceLine: number }[] {
  const rows: { cells: string[]; sourceLine: number }[] = []
  let cells: string[] = []
  let cell = ''
  let quoted = false
  let line = 1
  let startLine = 1
  const endRow = () => {
    cells.push(cell)
    if (cells.some((c) => c.trim())) rows.push({ cells, sourceLine: startLine })
    cells = []
    cell = ''
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') quoted = false
      else {
        if (char === '\n') line++
        cell += char
      }
    } else if (char === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (char === separator) {
      cells.push(cell)
      cell = ''
    } else if (char === '\n') {
      endRow()
      line++
      startLine = line
    } else cell += char
  }
  endRow()
  return rows
}

/** El CSV no tiene el encabezado de la plantilla. */
export class CsvHeaderError extends Error {}

/**
 * Lee un CSV con el encabezado de la plantilla: `escenario,hora,conjunto,direccion` (la
 * dirección es opcional y las columnas pueden ir en otro orden). Acepta también el punto y
 * coma con el que exportan las planillas en español.
 */
export function parseGridCsv(text: string): ParseResult {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const source = withoutBom.replace(/\r\n?/g, '\n')
  const firstLine = source.split('\n').find((row) => row.trim()) ?? ''
  const separator = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const [header, ...rows] = csvRows(source, separator)
  const columns = header && readHeader(header.cells.map((cell) => cell.trim()))
  if (!columns) throw new CsvHeaderError('Falta el encabezado: escenario,hora,conjunto,direccion')

  const out = new Collector()
  for (const { cells, sourceLine } of rows) {
    readRow(out, cells, columns, sourceLine, clean(cells.join(separator)))
  }
  return out.result('csv')
}
