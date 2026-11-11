import { departureTime, paradeRules, passTime, type ParadeRules } from '@cuerda/shared'
import type { Coords, ParadeEvent, ParadeSlot, RouteCorner } from '../../lib/api'

/**
 * La lógica del modo Llamadas que no depende de la pantalla: qué noche se muestra, las
 * cuadras del recorrido y las horas estimadas. Todo se calcula en el teléfono, sin red.
 * Las horas salen de `@cuerda/shared` (decisión 63) y son siempre estimaciones.
 */

/** Así se marca el orden de desfile de prueba (`pnpm db:llamadas`). */
export const SAMPLE_ORDER_SOURCE = 'orden-ficticio'

/**
 * La noche que se muestra si no se eligió ninguna: la de hoy si hoy hay desfile; si no, la
 * próxima; si ya pasaron todas, la última.
 */
export function pickNight(events: ParadeEvent[], today: string): ParadeEvent | null {
  const nights = [...events].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
  return nights.find((night) => night.fecha_inicio >= today) ?? nights.at(-1) ?? null
}

/** Un lugar del orden con su hora estimada de salida. */
export interface TimedSlot extends ParadeSlot {
  /** Estimación: quien la muestra tiene que decirlo. */
  time: Date
}

/** A qué hora sale cada comparsa de la noche, en el orden del desfile. */
export function departures(event: ParadeEvent, order: ParadeSlot[]): TimedSlot[] {
  const rules = paradeRules(event)
  return order.map((slot) => ({
    ...slot,
    time: departureTime(event.fecha_inicio, slot.posicion, rules),
  }))
}

/** Una cuadra del recorrido: el tramo entre dos esquinas seguidas. */
export interface Block {
  /** La primera cuadra es la 1. */
  number: number
  /** La calle por la que va el desfile en esa cuadra. */
  street: string
  /** Las dos calles que la limitan, en el sentido del desfile. */
  from: string
  to: string
  start: Coords
  end: Coords
  /** Metros desde la salida hasta la mitad de la cuadra: ahí se calcula la hora de paso. */
  middleM: number
}

/** Las cuadras de un recorrido. Con menos de dos esquinas no hay ninguna. */
export function blocksOf(corners: RouteCorner[]): Block[] {
  const sorted = [...corners].sort((a, b) => a.orden - b.orden)
  return sorted.slice(1).map((corner, i) => {
    const previous = sorted[i]!
    return {
      number: i + 1,
      // La cuadra se llama como la calle a la que se llega: donde el recorrido cambia de
      // nombre (Carlos Gardel pasa a ser Isla de Flores), la esquina dice el nombre nuevo.
      street: previous.calle,
      from: previous.cruce,
      to: corner.cruce,
      start: { lat: previous.lat, lng: previous.lng },
      end: { lat: corner.lat, lng: corner.lng },
      middleM: (previous.distancia_m + corner.distancia_m) / 2,
    }
  })
}

/** Metros entre un punto y un tramo, en un plano local (alcanza para unas pocas cuadras). */
function distanceToSegment(point: Coords, a: Coords, b: Coords): number {
  const mPerLat = 111_320
  const mPerLng = 111_320 * Math.cos((point.lat * Math.PI) / 180)
  const px = (point.lng - a.lng) * mPerLng
  const py = (point.lat - a.lat) * mPerLat
  const bx = (b.lng - a.lng) * mPerLng
  const by = (b.lat - a.lat) * mPerLat
  const length2 = bx * bx + by * by
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / length2))
  return Math.hypot(px - t * bx, py - t * by)
}

/** La cuadra más cercana a una posición, y a cuántos metros queda. */
export function nearestBlock(
  blocks: Block[],
  position: Coords,
): { block: Block; distanceM: number } | null {
  let best: { block: Block; distanceM: number } | null = null
  for (const block of blocks) {
    const distanceM = distanceToSegment(position, block.start, block.end)
    if (!best || distanceM < best.distanceM) best = { block, distanceM }
  }
  return best
}

/** A qué hora pasa cada comparsa por la mitad de una cuadra, en el orden del desfile. */
export function passTimes(event: ParadeEvent, order: ParadeSlot[], block: Block): TimedSlot[] {
  const rules: ParadeRules = paradeRules(event)
  return order.map((slot) => ({
    ...slot,
    time: passTime(event.fecha_inicio, slot.posicion, block.middleM, rules),
  }))
}
