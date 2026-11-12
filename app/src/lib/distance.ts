import type { Coords } from './api'

/** Radio medio de la Tierra, en metros. */
const EARTH_RADIUS_M = 6_371_008.8

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/**
 * Metros entre dos puntos, en línea recta sobre la esfera (haversine). Para las distancias
 * de una ciudad el error contra el elipsoide es de menos del 0,5 %. Se calcula en el teléfono:
 * la posición del usuario no se manda a ningún lado (decisión 90).
 */
export function distanceMeters(a: Coords, b: Coords): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}
