import { toLines } from '../../lib/text'

/** Los puntos del tramo, o null si alguna línea no es «latitud, longitud». */
export function readPoints(text: string): { lat: number; lng: number }[] | null {
  const points = []
  for (const line of toLines(text)) {
    const match = /^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/.exec(line)
    if (!match) return null
    const lat = Number(match[1])
    const lng = Number(match[2])
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
    points.push({ lat, lng })
  }
  return points
}
