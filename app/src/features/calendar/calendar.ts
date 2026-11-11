import type { CalendarEvent } from '../../lib/api'

/**
 * El calendario como lista: meses, y dentro de cada mes una fila por día (decisión 55).
 * Todo son fechas puras (`YYYY-MM-DD`), que se comparan como texto: ninguna zona horaria
 * puede correr un día. «Hoy» llega de afuera, calculado con la noche lógica de Montevideo.
 */

export interface CalendarDay {
  /** `YYYY-MM-DD`. */
  date: string
  isToday: boolean
  /** Los eventos que empiezan ese día, en el orden en que llegaron. */
  events: CalendarEvent[]
  /** Sólo en la fila de hoy: los que empezaron antes y todavía no terminaron. */
  ongoing: CalendarEvent[]
}

export interface CalendarMonth {
  /** `YYYY-MM`. */
  month: string
  days: CalendarDay[]
}

/** Si el evento ya terminó. Uno de varios días no pasó hasta que pasa su último día. */
export function isPastEvent(event: CalendarEvent, today: string): boolean {
  return event.fecha_fin < today
}

export function isMultiDay(event: CalendarEvent): boolean {
  return event.fecha_fin > event.fecha_inicio
}

/** Pretemporada: lo que empieza antes del primer día de la temporada. */
export function isPreseason(event: CalendarEvent, seasonStart: string): boolean {
  return event.fecha_inicio < seasonStart
}

/**
 * Arma el calendario. Cada evento va el día que empieza; hoy tiene siempre su fila, aunque
 * no empiece nada, y ahí se repiten los eventos de varios días que están en curso.
 */
export function buildCalendar(events: CalendarEvent[], today: string): CalendarMonth[] {
  const sorted = [...events].sort(
    (a, b) =>
      a.fecha_inicio.localeCompare(b.fecha_inicio) ||
      a.fecha_fin.localeCompare(b.fecha_fin) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  )
  const dates = [...new Set([...sorted.map((event) => event.fecha_inicio), today])].sort()

  const months: CalendarMonth[] = []
  for (const date of dates) {
    const isToday = date === today
    const day: CalendarDay = {
      date,
      isToday,
      events: sorted.filter((event) => event.fecha_inicio === date),
      ongoing: isToday
        ? sorted.filter((event) => event.fecha_inicio < today && event.fecha_fin >= today)
        : [],
    }
    const month = date.slice(0, 7)
    const last = months[months.length - 1]
    if (last && last.month === month) last.days.push(day)
    else months.push({ month, days: [day] })
  }
  return months
}
