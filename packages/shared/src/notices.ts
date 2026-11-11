import { MONTEVIDEO_TZ, minutesOfDayInMontevideo } from './dates.ts'
import { departureTime, paradeRules } from './llamadas.ts'
import { noticeTexts, type NoticeLanguage, type NoticeTexts } from './noticeTexts.ts'

/**
 * Los avisos push, sin mandarlos: a partir de las filas que devuelve la base (quién recibe
 * qué) arma una notificación por dispositivo, con su texto en el idioma del dispositivo y
 * la pantalla que abre al tocarla. No depende de Firebase ni de la red: lo usan las Edge
 * Functions y se prueba solo. Las horas van siempre en la zona de Montevideo.
 */

/** Una notificación lista para mandar a un dispositivo. */
export interface Notice {
  token: string
  language: NoticeLanguage
  title: string
  body: string
  /** Ruta de la app que se abre al tocarla. */
  route: string
  /** Ids de `avisos_enviados` que cubre: se cierran cuando el envío sale bien. */
  noticeIds: number[]
}

/** Lo que traen todas las filas: a quién va el aviso y de qué conjunto habla. */
interface NoticeRow {
  aviso_id: number
  token: string
  idioma: NoticeLanguage
  conjunto_id: number
  conjunto_slug: string
  conjunto_nombre: string
  noche: string
}

/**
 * Una fila de `tomar_avisos_del_dia`: una actuación en un escenario o, si trae
 * `desfile_posicion`, el lugar de una comparsa en el Desfile de Llamadas de esa noche. Las
 * filas de desfile no tienen actuación ni hora: la hora se estima acá, con la regla del
 * desfile y lo que el evento diga de su horario (decisión 68).
 */
export interface DailyRow extends NoticeRow {
  actuacion_id: number | null
  inicio: string | null
  escenario_nombre: string | null
  desfile_posicion?: number | null
  desfile_inicio?: string | null
  desfile_intervalo_min?: number | null
  desfile_separacion_m?: number | null
  desfile_atraso_min?: number | null
}

/** Una fila de `tomar_avisos_de_cambios`. */
export interface ChangeRow extends NoticeRow {
  actuacion_id: number
  inicio: string
  escenario_nombre: string
  estado: 'programada' | 'cambiada' | 'suspendida'
  estado_anterior: 'programada' | 'cambiada' | 'suspendida'
  inicio_anterior: string
}

/** Cuántos renglones entran en el cuerpo de un aviso agrupado antes del «y N más». */
const MAX_LINES = 4

/** El aviso del día sale entre las 12:00 y las 19:00 de Montevideo (decisión 47). */
const DAILY_FROM_MIN = 12 * 60
/** Con un margen, para que la pasada de las 19:00 en punto entre aunque arranque tarde. */
const DAILY_UNTIL_MIN = 19 * 60 + 15

export function isDailyNoticeWindow(instant: Date = new Date()): boolean {
  const minutes = minutesOfDayInMontevideo(instant)
  return minutes >= DAILY_FROM_MIN && minutes < DAILY_UNTIL_MIN
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(values[key] ?? ''))
}

/** `Intl` separa «10:50» de «PM» con un espacio angosto que algunos teléfonos no muestran. */
const plainSpaces = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ')

function formatTime(instant: string, texts: NoticeTexts): string {
  return plainSpaces(
    new Intl.DateTimeFormat(texts.locale, {
      minute: '2-digit',
      timeZone: MONTEVIDEO_TZ,
      // En español, reloj de 24 horas como en las carteleras («22:50»); en inglés, «10:50 PM».
      ...(texts.locale.startsWith('en')
        ? { hour: 'numeric', hour12: true }
        : { hour: '2-digit', hourCycle: 'h23' }),
    }).format(new Date(instant)),
  )
}

/** «hoy», o «el sábado 30 de enero» si la noche no es la de hoy. */
function formatWhen(noche: string, tonight: string, texts: NoticeTexts): string {
  if (noche === tonight) return texts.tonight
  // Una fecha pura: se formatea en UTC para que ninguna zona le corra el día.
  const date = new Date(`${noche}T00:00:00Z`)
  const part = (options: Intl.DateTimeFormatOptions) =>
    plainSpaces(new Intl.DateTimeFormat(texts.locale, { ...options, timeZone: 'UTC' }).format(date))
  return fill(texts.otherNight, {
    weekday: part({ weekday: 'long' }),
    date: part({ day: 'numeric', month: 'long' }),
  })
}

/** Junta los renglones de un aviso agrupado, con «y N más» si no entran todos. */
function joinLines(lines: string[], texts: NoticeTexts): string {
  if (lines.length <= MAX_LINES) return lines.join('\n')
  const shown = lines.slice(0, MAX_LINES - 1)
  const count = lines.length - shown.length
  return [...shown, fill(count === 1 ? texts.more_one : texts.more_other, { count })].join('\n')
}

/** Agrupa conservando el orden en que aparece cada clave. */
function groupBy<T, K>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return groups
}

const byStart = <T extends { inicio: string; actuacion_id: number }>(rows: T[]): T[] =>
  [...rows].sort(
    (a, b) =>
      new Date(a.inicio).getTime() - new Date(b.inicio).getTime() ||
      a.actuacion_id - b.actuacion_id,
  )

const uniqueIds = (rows: NoticeRow[]): number[] => [...new Set(rows.map((row) => row.aviso_id))]

const groupRoute = (slug: string) => `/conjuntos/${encodeURIComponent(slug)}`
const mineRoute = (noche: string) => `/?noche=${noche}&mios=1`
const paradeRoute = (noche: string) => `/llamadas?noche=${noche}`

/** Una fila del aviso del día con su hora: la de la actuación o la estimada del desfile. */
interface Slot {
  row: DailyRow
  at: Date
  parade: boolean
}

function slotOf(row: DailyRow): Slot {
  if (row.desfile_posicion != null) {
    return {
      row,
      parade: true,
      at: departureTime(row.noche, row.desfile_posicion, paradeRules(row)),
    }
  }
  return { row, parade: false, at: new Date(row.inicio ?? `${row.noche}T00:00:00Z`) }
}

const byTime = (slots: Slot[]): Slot[] =>
  [...slots].sort(
    (a, b) =>
      a.at.getTime() - b.at.getTime() || (a.row.actuacion_id ?? 0) - (b.row.actuacion_id ?? 0),
  )

/**
 * «Tu conjunto actúa hoy»: una notificación por dispositivo.
 *
 * - Un conjunto en un escenario: hora y lugar.
 * - Un conjunto en varios escenarios esa noche: una sola, con todas sus horas.
 * - Una comparsa que desfila en las Llamadas: la hora estimada de salida, dicha como
 *   estimada, y abre el modo Llamadas en esa noche.
 * - Varios conjuntos: un resumen, un renglón por conjunto.
 */
export function buildDailyNotices(rows: DailyRow[]): Notice[] {
  return [...groupBy(rows, (row) => row.token)].map(([token, deviceRows]) => {
    const language = deviceRows[0]!.idioma
    const texts: NoticeTexts = noticeTexts[language]
    const time = (slot: Slot) => formatTime(slot.at.toISOString(), texts)
    const groups = [
      ...groupBy(byTime(deviceRows.map(slotOf)), (slot) => slot.row.conjunto_id).values(),
    ]
    const slots = (acts: Slot[]) =>
      acts
        .map((act) =>
          act.parade
            ? fill(texts.paradeSlot, { time: time(act) })
            : fill(texts.slot, { time: time(act), stage: act.row.escenario_nombre ?? '' }),
        )
        .join(texts.slotSeparator)
    const base = { token, language, noticeIds: uniqueIds(deviceRows) }
    const noche = deviceRows[0]!.noche

    if (groups.length === 1) {
      const acts = groups[0]!
      const first = acts[0]!
      if (acts.length === 1 && first.parade) {
        return {
          ...base,
          title: fill(texts.paradeOneTitle, { group: first.row.conjunto_nombre }),
          body: fill(texts.paradeOneBody, { time: time(first) }),
          route: paradeRoute(noche),
        }
      }
      return {
        ...base,
        title: fill(texts.dailyOneTitle, { group: first.row.conjunto_nombre }),
        body:
          acts.length === 1
            ? fill(texts.dailyOneBody, {
                time: time(first),
                stage: first.row.escenario_nombre ?? '',
              })
            : slots(acts),
        route: groupRoute(first.row.conjunto_slug),
      }
    }

    // Si todo lo de esa noche es el desfile, el resumen habla de comparsas y abre Llamadas.
    const allParade = groups.every((acts) => acts.every((act) => act.parade))
    return {
      ...base,
      title: fill(allParade ? texts.paradeManyTitle : texts.dailyManyTitle, {
        count: groups.length,
      }),
      body: joinLines(
        groups.map((acts) =>
          fill(texts.groupLine, { group: acts[0]!.row.conjunto_nombre, detail: slots(acts) }),
        ),
        texts,
      ),
      route: allParade ? paradeRoute(noche) : mineRoute(noche),
    }
  })
}

type ChangeKind = 'suspended' | 'resumed' | 'changed'

function kindOf(row: ChangeRow): ChangeKind {
  if (row.estado === 'suspendida') return 'suspended'
  return row.estado_anterior === 'suspendida' ? 'resumed' : 'changed'
}

/**
 * Cambios y suspensiones: una notificación por dispositivo con todo lo suyo, no una por
 * actuación. `tonight` es la noche lógica de ahora: los avisos de otra noche dicen el día.
 */
export function buildChangeNotices(rows: ChangeRow[], tonight: string): Notice[] {
  return [...groupBy(rows, (row) => row.token)].map(([token, deviceRows]) => {
    const language = deviceRows[0]!.idioma
    const texts: NoticeTexts = noticeTexts[language]
    const changes = byStart(deviceRows)
    const values = (row: ChangeRow) => ({
      group: row.conjunto_nombre,
      when: formatWhen(row.noche, tonight, texts),
      time: formatTime(row.inicio, texts),
      stage: row.escenario_nombre,
      before: formatTime(row.inicio_anterior, texts),
    })
    const base = { token, language, noticeIds: uniqueIds(deviceRows) }
    const sameGroup = changes.every((row) => row.conjunto_id === changes[0]!.conjunto_id)
    const sameNight = changes.every((row) => row.noche === changes[0]!.noche)
    const route = sameGroup
      ? groupRoute(changes[0]!.conjunto_slug)
      : mineRoute(sameNight ? changes[0]!.noche : tonight)

    if (changes.length === 1) {
      const row = changes[0]!
      const kind = kindOf(row)
      // «Antes, a las…» sólo si lo que cambió fue la hora.
      const timeMoved =
        kind === 'changed' &&
        new Date(row.inicio).getTime() !== new Date(row.inicio_anterior).getTime()
      const body =
        kind === 'suspended'
          ? texts.suspendedBody
          : kind === 'resumed'
            ? texts.resumedBody
            : timeMoved
              ? texts.changedBodyWas
              : texts.changedBody
      return {
        ...base,
        title: fill(texts[`${kind}Title`], values(row)),
        body: fill(body, values(row)),
        route,
      }
    }

    return {
      ...base,
      title: texts.changesTitle,
      body: joinLines(
        changes.map((row) =>
          fill(kindOf(row) === 'suspended' ? texts.suspendedLine : texts.changedLine, values(row)),
        ),
        texts,
      ),
      route,
    }
  })
}
