import type { CalendarEvent } from '../../lib/api'

type WithTickets = Pick<CalendarEvent, 'entradas_url' | 'entradas_texto'>

/** La dirección de la venta oficial. Sólo se enlaza una dirección web de verdad. */
export function ticketsUrl(event: WithTickets): string | null {
  const value = event.entradas_url
  return value && /^https?:\/\//i.test(value) ? value : null
}

/** Si el evento tiene algo cargado sobre la venta de entradas. */
export function hasTickets(event: WithTickets): boolean {
  return ticketsUrl(event) !== null || Boolean(event.entradas_texto)
}
